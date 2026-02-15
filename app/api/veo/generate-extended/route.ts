import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVeoVideo, getVeoOperationStatus, calculateVeoCreditCost } from '@/lib/google-veo'
import { getEffectivePlan, canUseVeo } from '@/lib/plan-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

export const maxDuration = 300

const VALID_EXTENDED_DURATIONS = [4, 6, 8, 15, 30, 60, 120, 300, 600, 1800, 2700, 3600]
const VALID_ASPECT_RATIOS: VeoAspectRatio[] = ['16:9', '9:16']
const VALID_MODELS: VeoModel[] = ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']
const SEGMENT_DURATION: VeoDuration = 8
const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 240

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000'
  )
}

/** Poll a Veo operation until done or timeout */
async function pollUntilDone(operationName: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const status = await getVeoOperationStatus(operationName)
    if (status.error) throw new Error(`Veo generation failed: ${status.error}`)
    if (status.done && status.videoUri) return status.videoUri
  }
  throw new Error('Video generation timed out')
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
    const {
      title,
      prompt,
      aspectRatio = '16:9',
      duration = 8,
      model = 'veo-3.1-generate-preview',
      generateAudio = false,
      negativePrompt,
    } = body

    // Validate
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt exceeds 5000 character limit' }, { status: 400 })
    }
    if (!VALID_EXTENDED_DURATIONS.includes(duration)) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }
    if (!VALID_ASPECT_RATIOS.includes(aspectRatio as VeoAspectRatio)) {
      return NextResponse.json({ error: 'Invalid aspect ratio' }, { status: 400 })
    }
    if (!VALID_MODELS.includes(model as VeoModel)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
    }

    // Check plan
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const planId = getEffectivePlan(subscription?.plan, subscription?.status)
    if (!canUseVeo(planId)) {
      return NextResponse.json(
        { error: 'AI Video Studio requires a Creator or Enterprise plan.', code: 'PLAN_REQUIRED' },
        { status: 403 }
      )
    }

    // ── Short durations (<=8s) — single-clip, synchronous ──
    if (duration <= 8) {
      const creditCost = calculateVeoCreditCost(duration as VeoDuration, model as VeoModel)
      const videoId = crypto.randomUUID()

      const creditResult = await consumeCredits({
        userId: user.id,
        amount: creditCost,
        resourceType: 'veo_video',
        resourceId: videoId,
        description: `Veo video: ${title.trim()}`,
      })

      if (!creditResult.success) {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${creditCost}, have ${creditResult.remaining}.`, code: 'INSUFFICIENT_CREDITS' },
          { status: 403 }
        )
      }

      try {
        const result = await generateVeoVideo({
          prompt: prompt.trim(),
          aspectRatio: aspectRatio as VeoAspectRatio,
          duration: duration as VeoDuration,
          generateAudio,
          negativePrompt: negativePrompt?.trim() || undefined,
          model: model as VeoModel,
        })

        const dim = aspectRatio === '9:16' ? '720x1280' : '1280x720'
        const { data: videoRecord, error: dbError } = await getSupabaseAdmin()
          .from('videos')
          .insert({
            id: videoId,
            user_id: user.id,
            title: title.trim(),
            mode: 'ugc',
            status: 'pending',
            provider: 'google_veo',
            prompt: prompt.trim(),
            dimension: dim,
            credits_used: creditCost,
            veo_operation_name: result.operationName,
            veo_model: model,
            audio_enabled: generateAudio,
          })
          .select()
          .single()

        if (dbError) throw new Error(`Failed to save video record: ${dbError.message}`)
        return NextResponse.json({ video: videoRecord })
      } catch (err) {
        await refundCredits({
          userId: user.id,
          amount: creditCost,
          resourceId: videoId,
          reason: 'Veo video generation failed — credits refunded',
        }).catch(() => {})
        throw err
      }
    }

    // ── Extended durations (>8s) — multi-segment via background worker ──
    const numSegments = Math.ceil(duration / SEGMENT_DURATION)
    const totalCredits = calculateVeoCreditCost(duration, model as VeoModel)
    const videoId = crypto.randomUUID()
    const isStandard = model === 'veo-3.1-generate-preview'

    const creditResult = await consumeCredits({
      userId: user.id,
      amount: totalCredits,
      resourceType: 'veo_extended',
      resourceId: videoId,
      description: `Extended video: ${title.trim()} (${numSegments} segments, ${duration}s)`,
    })

    if (!creditResult.success) {
      return NextResponse.json(
        { error: `Insufficient credits. Need ${totalCredits}, have ${creditResult.remaining}.`, code: 'INSUFFICIENT_CREDITS' },
        { status: 403 }
      )
    }

    // Create video record
    const dimension = aspectRatio === '9:16'
      ? (isStandard ? '2160x3840' : '720x1280')
      : (isStandard ? '3840x2160' : '1280x720')

    const { error: videoDbErr } = await getSupabaseAdmin()
      .from('videos')
      .insert({
        id: videoId,
        user_id: user.id,
        title: title.trim(),
        mode: 'ugc',
        status: 'processing',
        provider: 'google_veo',
        prompt: prompt.trim(),
        dimension,
        credits_used: totalCredits,
        veo_model: model,
        audio_enabled: generateAudio,
        duration,
      })

    if (videoDbErr) {
      await refundCredits({
        userId: user.id,
        amount: totalCredits,
        resourceId: videoId,
        reason: 'Failed to create video record — credits refunded',
        resourceType: 'veo_extended',
      }).catch(() => {})
      return NextResponse.json({ error: 'Failed to save video record' }, { status: 500 })
    }

    // Build segment data for the worker
    const segments = Array.from({ length: numSegments }, (_, i) => ({
      index: i,
      prompt: i === 0
        ? prompt.trim()
        : `Continuation of the scene: ${prompt.trim()}. Maintain visual consistency, smooth transition, and continuous flow from the previous shot. Segment ${i + 1} of ${numSegments}.`,
      duration: SEGMENT_DURATION,
      imageMode: null,
      label: `Clip ${i + 1}`,
      status: 'pending' as const,
      videoUri: null,
    }))

    const segmentData = {
      type: 'extended' as const,
      segments,
      params: {
        aspectRatio: aspectRatio as VeoAspectRatio,
        model: model as VeoModel,
        generateAudio,
        negativePrompt: negativePrompt?.trim() || null,
        productImages: null,
      },
      composition: {
        userId: user.id,
        videoId,
        totalCredits,
        isStandard,
        storageBucket: 'exports',
        storagePath: `extended-videos/${user.id}/${videoId}.mp4`,
      },
    }

    // Create job with segment data
    const { data: job } = await getSupabaseAdmin()
      .from('template_jobs')
      .insert({
        user_id: user.id,
        video_id: videoId,
        template_id: 'extended_text_to_video',
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
      .eq('id', videoId)
      .single()

    // Trigger background worker (fire-and-forget)
    if (jobId) {
      triggerWorker(jobId)
    }

    // Return immediately — client polls /api/veo/template-job/[jobId]
    return NextResponse.json({ video: videoRecord, job: { id: jobId } })
  } catch (error) {
    console.error('Extended generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate extended video'

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429') || message.includes('quota')) {
      return NextResponse.json(
        { error: 'Google Veo API quota exceeded. Please wait a few minutes and try again.' },
        { status: 429 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
