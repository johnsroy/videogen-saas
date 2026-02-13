import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateMusic } from '@/lib/replicate-music'
import { consumeCredits, AI_MUSIC_CREDIT_COST } from '@/lib/credits'

const MAX_PROMPT_LENGTH = 500
const MIN_DURATION = 5
const MAX_DURATION = 30

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, duration_seconds } = body

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Music prompt is required' }, { status: 400 })
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: `Prompt exceeds ${MAX_PROMPT_LENGTH} character limit` }, { status: 400 })
    }

    const duration = typeof duration_seconds === 'number'
      ? Math.min(MAX_DURATION, Math.max(MIN_DURATION, duration_seconds))
      : 15

    // Check credit balance
    const { data: balance } = await getSupabaseAdmin()
      .from('credit_balances')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .single()

    if (!balance || balance.credits_remaining < AI_MUSIC_CREDIT_COST) {
      return NextResponse.json(
        {
          error: `Need ${AI_MUSIC_CREDIT_COST} credit for music generation. You have ${balance?.credits_remaining ?? 0} credits.`,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 403 }
      )
    }

    // Generate music via Replicate MusicGen
    const audioUrl = await generateMusic({
      prompt: prompt.trim(),
      duration_seconds: duration,
    })

    // Download the audio from Replicate and upload to our storage
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error('Failed to download generated audio')
    const audioBuffer = await audioRes.arrayBuffer()

    const trackId = crypto.randomUUID()
    const storagePath = `${user.id}/${trackId}.mp3`

    const { error: uploadError } = await getSupabaseAdmin()
      .storage
      .from('music')
      .upload(storagePath, Buffer.from(audioBuffer), {
        contentType: 'audio/mpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Music storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to store music' }, { status: 500 })
    }

    const { data: urlData } = getSupabaseAdmin()
      .storage
      .from('music')
      .getPublicUrl(storagePath)

    // Insert record
    const { data: track, error: insertError } = await getSupabaseAdmin()
      .from('ai_music_tracks')
      .insert({
        id: trackId,
        user_id: user.id,
        prompt: prompt.trim(),
        duration_seconds: duration,
        audio_url: urlData.publicUrl,
        credits_used: AI_MUSIC_CREDIT_COST,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Music DB insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save music record' }, { status: 500 })
    }

    // Consume credits
    await consumeCredits({
      userId: user.id,
      amount: AI_MUSIC_CREDIT_COST,
      resourceType: 'ai_music',
      resourceId: trackId,
      description: `AI music generation: "${prompt.trim().slice(0, 50)}"`,
    })

    return NextResponse.json({ track })
  } catch (error) {
    console.error('Music generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate music'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
