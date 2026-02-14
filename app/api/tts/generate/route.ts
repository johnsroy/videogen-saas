import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateSpeech, isValidVoice } from '@/lib/openai-tts'
import { consumeCredits, refundCredits } from '@/lib/credits'

const VOICEOVER_CREDIT_COST = 1
const MAX_SCRIPT_LENGTH = 5000

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { video_id, script, voice, instructions, speed } = body

    // Validate input
    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }
    if (script.length > MAX_SCRIPT_LENGTH) {
      return NextResponse.json({ error: `Script exceeds ${MAX_SCRIPT_LENGTH} character limit` }, { status: 400 })
    }
    if (!voice || !isValidVoice(voice)) {
      return NextResponse.json({ error: 'Invalid voice selection' }, { status: 400 })
    }
    if (instructions && typeof instructions !== 'string') {
      return NextResponse.json({ error: 'Instructions must be a string' }, { status: 400 })
    }
    const parsedSpeed = typeof speed === 'number' ? speed : 1.0
    if (parsedSpeed < 0.25 || parsedSpeed > 4.0) {
      return NextResponse.json({ error: 'Speed must be between 0.25 and 4.0' }, { status: 400 })
    }

    // Consume credits FIRST (atomic — prevents double-spend)
    const voiceoverId = crypto.randomUUID()
    const creditResult = await consumeCredits({
      userId: user.id,
      amount: VOICEOVER_CREDIT_COST,
      resourceType: 'voiceover',
      resourceId: voiceoverId,
      description: `Voiceover generation (${voice}, ${parsedSpeed}x speed)`,
    })

    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: `Need ${VOICEOVER_CREDIT_COST} credit for voiceover generation. You have ${creditResult.remaining} credits.`,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 403 }
      )
    }

    try {
      // Generate speech via OpenAI TTS
      const audioBuffer = await generateSpeech({
        input: script.trim(),
        voice,
        instructions: instructions?.trim() || undefined,
        speed: parsedSpeed,
      })

      const storagePath = `${user.id}/${voiceoverId}.mp3`

      // Upload to Supabase Storage
      const { error: uploadError } = await getSupabaseAdmin()
        .storage
        .from('voiceovers')
        .upload(storagePath, Buffer.from(audioBuffer), {
          contentType: 'audio/mpeg',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Failed to store voiceover: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = getSupabaseAdmin()
        .storage
        .from('voiceovers')
        .getPublicUrl(storagePath)

      const audioUrl = urlData.publicUrl

      // Estimate duration (~150 words/min at 1x speed, average 5 chars/word)
      const wordCount = script.trim().split(/\s+/).length
      const estimatedDuration = (wordCount / 150) * 60 / parsedSpeed

      // Insert voiceover record
      const { data: voiceover, error: insertError } = await getSupabaseAdmin()
        .from('voiceovers')
        .insert({
          id: voiceoverId,
          user_id: user.id,
          video_id: video_id || null,
          voice,
          script: script.trim(),
          instructions: instructions?.trim() || null,
          speed: parsedSpeed,
          audio_url: audioUrl,
          duration_seconds: Math.round(estimatedDuration),
          credits_used: VOICEOVER_CREDIT_COST,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to save voiceover record: ${insertError.message}`)
      }

      return NextResponse.json({ voiceover })
    } catch (genError) {
      // Generation failed — refund credits
      await refundCredits({
        userId: user.id,
        amount: VOICEOVER_CREDIT_COST,
        resourceId: voiceoverId,
        reason: 'Voiceover generation failed — credits refunded',
      }).catch(() => {})

      console.error('TTS generation error:', genError)
      const message = genError instanceof Error ? genError.message : 'Voiceover generation failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('TTS generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate voiceover'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
