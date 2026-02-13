import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { extendVeoVideo, calculateVeoCreditCost } from '@/lib/google-veo'
import { getEffectivePlan, canUseVeo, canUseVideoExtension } from '@/lib/plan-utils'
import { consumeCredits } from '@/lib/credits'

const VALID_EXTEND_DURATIONS = [4, 6, 8]

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, prompt, extendDurationSeconds = 8 } = body

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt exceeds 5000 character limit' }, { status: 400 })
    }
    if (!VALID_EXTEND_DURATIONS.includes(extendDurationSeconds)) {
      return NextResponse.json({ error: 'Invalid extension duration. Must be 4, 6, or 8 seconds.' }, { status: 400 })
    }

    // Check plan
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const planId = getEffectivePlan(subscription?.plan, subscription?.status)

    if (!canUseVeo(planId) || !canUseVideoExtension(planId)) {
      return NextResponse.json(
        { error: 'Video extension requires a Creator or Enterprise plan.', code: 'PLAN_REQUIRED' },
        { status: 403 }
      )
    }

    // Fetch the parent video
    const { data: parentVideo } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .eq('provider', 'google_veo')
      .eq('status', 'completed')
      .single()

    if (!parentVideo) {
      return NextResponse.json({ error: 'Video not found or not completed' }, { status: 404 })
    }

    if (!parentVideo.video_url) {
      return NextResponse.json({ error: 'Video has no URL to extend from' }, { status: 400 })
    }

    // Check credit balance (without consuming yet)
    const creditsCost = calculateVeoCreditCost(extendDurationSeconds, parentVideo.veo_model ?? 'veo-3.1-generate-preview')
    const { data: balance } = await getSupabaseAdmin()
      .from('credit_balances')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .single()

    if (!balance || balance.credits_remaining < creditsCost) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Need ${creditsCost}, have ${balance?.credits_remaining ?? 0}.`,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 403 }
      )
    }

    // Call Veo extend API first (before consuming credits)
    const result = await extendVeoVideo({
      videoUri: parentVideo.video_url,
      prompt: prompt.trim(),
      extendDurationSeconds,
    })

    // Insert new video record linked to parent
    const { data: videoRecord, error: dbError } = await getSupabaseAdmin()
      .from('videos')
      .insert({
        user_id: user.id,
        title: `${parentVideo.title} (Extended)`,
        mode: 'extension',
        status: 'pending',
        provider: 'google_veo',
        prompt: prompt.trim(),
        dimension: parentVideo.dimension,
        style: parentVideo.style,
        credits_used: creditsCost,
        veo_operation_name: result.operationName,
        veo_model: parentVideo.veo_model,
        audio_enabled: parentVideo.audio_enabled,
        extend_count: (parentVideo.extend_count ?? 0) + 1,
        parent_video_id: videoId,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error inserting Veo extension:', dbError)
      return NextResponse.json({ error: 'Failed to save video record' }, { status: 500 })
    }

    // Consume credits AFTER successful API call + DB insert, using extension video ID
    await consumeCredits({
      userId: user.id,
      amount: creditsCost,
      resourceType: 'veo_video_extend',
      resourceId: videoRecord.id,
      description: `Veo extend: ${parentVideo.title}`,
    })

    return NextResponse.json({ video: videoRecord })
  } catch (error) {
    console.error('Veo extend error:', error)
    const message = error instanceof Error ? error.message : 'Failed to extend video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
