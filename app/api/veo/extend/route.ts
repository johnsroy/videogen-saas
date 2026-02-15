import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { extendVeoVideo, calculateVeoCreditCost } from '@/lib/google-veo'
import { getEffectivePlan, canUseVeo, canUseVideoExtension } from '@/lib/plan-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

export const maxDuration = 300

// Short durations use single-step Veo extend; longer ones use worker
const VALID_SHORT_DURATIONS = [4, 6, 8]
const VALID_ALL_DURATIONS = [4, 6, 8, 15, 30, 60, 120, 300, 600, 900, 1200]
const SEGMENT_DURATION: VeoDuration = 8

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000'
  )
}

/** Trigger the background worker to process segments */
function triggerWorker(jobId: string) {
  const url = `${getAppUrl()}/api/veo/worker`
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    body: JSON.stringify({ jobId }),
  }).catch((err) => {
    console.error('Failed to trigger worker:', err)
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { videoId, prompt, extendDurationSeconds = 8, generateAudio = false } = body

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt exceeds 5000 character limit' }, { status: 400 })
    }
    if (!VALID_ALL_DURATIONS.includes(extendDurationSeconds)) {
      return NextResponse.json({ error: 'Invalid extension duration' }, { status: 400 })
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

    const veoModel = (parentVideo.veo_model ?? 'veo-3.1-generate-preview') as VeoModel
    const creditsCost = calculateVeoCreditCost(extendDurationSeconds, veoModel)
    const extensionVideoId = crypto.randomUUID()

    // Consume credits FIRST (atomic — prevents double-spend)
    const creditResult = await consumeCredits({
      userId: user.id,
      amount: creditsCost,
      resourceType: 'veo_video_extend',
      resourceId: extensionVideoId,
      description: `Veo extend: ${parentVideo.title} (+${extendDurationSeconds}s)`,
    })

    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Need ${creditsCost}, have ${creditResult.remaining}.`,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 403 }
      )
    }

    // ── Short extensions (<=8s) — single-step Veo extend ──
    if (VALID_SHORT_DURATIONS.includes(extendDurationSeconds)) {
      try {
        const result = await extendVeoVideo({
          videoUri: parentVideo.video_url,
          prompt: prompt.trim(),
          extendDurationSeconds,
          generateAudio,
        })

        const { data: videoRecord, error: dbError } = await getSupabaseAdmin()
          .from('videos')
          .insert({
            id: extensionVideoId,
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
            veo_model: veoModel,
            audio_enabled: generateAudio,
            extend_count: (parentVideo.extend_count ?? 0) + 1,
            parent_video_id: videoId,
            duration: (parentVideo.duration ?? 0) + extendDurationSeconds,
          })
          .select()
          .single()

        if (dbError) throw new Error(`Failed to save video record: ${dbError.message}`)
        return NextResponse.json({ video: videoRecord })
      } catch (genError) {
        await refundCredits({
          userId: user.id,
          amount: creditsCost,
          resourceId: extensionVideoId,
          reason: 'Veo video extension failed — credits refunded',
        }).catch(() => {})
        console.error('Veo extend error:', genError)
        const message = genError instanceof Error ? genError.message : 'Failed to extend video'
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    // ── Long extensions (>8s) — multi-segment via background worker ──
    const numSegments = Math.ceil(extendDurationSeconds / SEGMENT_DURATION)
    const parentDuration = parentVideo.duration ?? 0
    const totalDuration = parentDuration + extendDurationSeconds
    const isStandard = veoModel === 'veo-3.1-generate-preview'
    const aspectRatio = (parentVideo.dimension?.includes('x3840') || parentVideo.dimension?.includes('9:16')
      ? '9:16' : '16:9') as VeoAspectRatio

    // Create video record
    const dimension = aspectRatio === '9:16'
      ? (isStandard ? '2160x3840' : '720x1280')
      : (isStandard ? '3840x2160' : '1280x720')

    const { error: videoDbErr } = await getSupabaseAdmin()
      .from('videos')
      .insert({
        id: extensionVideoId,
        user_id: user.id,
        title: `${parentVideo.title} (Extended +${extendDurationSeconds}s)`,
        mode: 'extension',
        status: 'processing',
        provider: 'google_veo',
        prompt: prompt.trim(),
        dimension,
        credits_used: creditsCost,
        veo_model: veoModel,
        audio_enabled: generateAudio,
        extend_count: (parentVideo.extend_count ?? 0) + 1,
        parent_video_id: videoId,
        duration: totalDuration,
      })

    if (videoDbErr) {
      await refundCredits({
        userId: user.id,
        amount: creditsCost,
        resourceId: extensionVideoId,
        reason: 'Failed to create video record — credits refunded',
        resourceType: 'veo_video_extend',
      }).catch(() => {})
      return NextResponse.json({ error: 'Failed to save video record' }, { status: 500 })
    }

    // Build segment data — new clips to concatenate after the original video
    const segments = Array.from({ length: numSegments }, (_, i) => ({
      index: i,
      prompt: i === 0
        ? `Seamless continuation of the scene: ${prompt.trim()}. Match the visual style, lighting, and composition of the source video. Maintain smooth transition.`
        : `Further continuation of the scene: ${prompt.trim()}. Maintain visual consistency, smooth transition, and continuous flow. Segment ${i + 1} of ${numSegments}.`,
      duration: SEGMENT_DURATION,
      imageMode: null,
      label: `Extension ${i + 1}`,
      status: 'pending' as const,
      videoUri: null,
    }))

    const segmentData = {
      type: 'extension_multi' as const,
      originalVideoUrl: parentVideo.video_url,
      segments,
      params: {
        aspectRatio,
        model: veoModel,
        generateAudio,
        negativePrompt: null,
        productImages: null,
      },
      composition: {
        userId: user.id,
        videoId: extensionVideoId,
        totalCredits: creditsCost,
        isStandard,
        storageBucket: 'exports',
        storagePath: `extended-videos/${user.id}/${extensionVideoId}.mp4`,
      },
    }

    // Create job
    const { data: job } = await getSupabaseAdmin()
      .from('template_jobs')
      .insert({
        user_id: user.id,
        video_id: extensionVideoId,
        template_id: 'video_extension',
        status: 'generating',
        total_segments: numSegments,
        completed_segments: 0,
        segment_data: segmentData,
      })
      .select()
      .single()

    const jobId = job?.id

    // Fetch video record to return
    const { data: videoRecord } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', extensionVideoId)
      .single()

    // Trigger background worker
    if (jobId) {
      triggerWorker(jobId)
    }

    return NextResponse.json({ video: videoRecord, job: { id: jobId } })
  } catch (error) {
    console.error('Veo extend error:', error)
    const message = error instanceof Error ? error.message : 'Failed to extend video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
