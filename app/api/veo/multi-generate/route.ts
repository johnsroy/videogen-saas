import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { calculateVeoCreditCost } from '@/lib/google-veo'
import { getEffectivePlan, canUseVeo } from '@/lib/plan-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

export const maxDuration = 60 // Only creates records and triggers worker

const VALID_DURATIONS: VeoDuration[] = [4, 6, 8]
const VALID_ASPECT_RATIOS: VeoAspectRatio[] = ['16:9', '9:16']
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BASE64_LENGTH = 15_000_000

interface SegmentInput {
  promptTemplate: string
  duration: VeoDuration
  imageMode: 'reference' | 'start_frame'
  label: string
}

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
    const {
      title,
      templateId,
      segments,
      aspectRatio = '16:9',
      generateAudio = false,
      model = 'veo-3.1-generate-preview',
      productImages,
      style,
    } = body

    // Validate
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }
    if (!Array.isArray(segments) || segments.length === 0 || segments.length > 500) {
      return NextResponse.json({ error: 'Segments array is required (1-500)' }, { status: 400 })
    }
    if (!VALID_ASPECT_RATIOS.includes(aspectRatio as VeoAspectRatio)) {
      return NextResponse.json({ error: 'Invalid aspect ratio' }, { status: 400 })
    }

    // Validate each segment
    for (const seg of segments as SegmentInput[]) {
      if (!seg.promptTemplate || typeof seg.promptTemplate !== 'string') {
        return NextResponse.json({ error: 'Each segment must have a promptTemplate' }, { status: 400 })
      }
      if (seg.promptTemplate.length > 5000) {
        return NextResponse.json({ error: 'Segment prompt exceeds 5000 character limit' }, { status: 400 })
      }
      if (!VALID_DURATIONS.includes(seg.duration)) {
        return NextResponse.json({ error: 'Each segment must have a valid duration (4, 6, or 8)' }, { status: 400 })
      }
    }

    // Validate product images
    if (productImages && Array.isArray(productImages)) {
      if (productImages.length > 3) {
        return NextResponse.json({ error: 'Maximum 3 product images allowed' }, { status: 400 })
      }
      for (const img of productImages) {
        if (!img.base64 || typeof img.base64 !== 'string' || img.base64.length > MAX_IMAGE_BASE64_LENGTH) {
          return NextResponse.json({ error: 'Invalid product image. Each must be under 10MB.' }, { status: 400 })
        }
        if (!VALID_IMAGE_TYPES.includes(img.mimeType)) {
          return NextResponse.json({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' }, { status: 400 })
        }
      }
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

    // Calculate total credit cost
    const typedSegments = segments as SegmentInput[]
    const totalCredits = typedSegments.reduce(
      (sum, seg) => sum + calculateVeoCreditCost(seg.duration, model as VeoModel),
      0
    )

    // Consume credits atomically upfront
    const videoId = crypto.randomUUID()
    const creditResult = await consumeCredits({
      userId: user.id,
      amount: totalCredits,
      resourceType: 'veo_template_multi',
      resourceId: videoId,
      description: `Template video: ${title.trim()} (${typedSegments.length} segments)`,
    })

    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Need ${totalCredits}, have ${creditResult.remaining}.`,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 403 }
      )
    }

    // Create video record
    const totalDuration = typedSegments.reduce((sum, seg) => sum + seg.duration, 0)
    const dimension = aspectRatio === '9:16' ? '2160x3840' : '3840x2160'

    const { data: videoRecord, error: videoDbErr } = await getSupabaseAdmin()
      .from('videos')
      .insert({
        id: videoId,
        user_id: user.id,
        title: title.trim(),
        mode: 'template_multi',
        status: 'processing',
        provider: 'google_veo',
        prompt: typedSegments.map((s) => s.promptTemplate).join(' | '),
        dimension,
        style: style ?? null,
        credits_used: totalCredits,
        veo_model: model,
        audio_enabled: generateAudio,
        duration: totalDuration,
      })
      .select()
      .single()

    if (videoDbErr) {
      await refundCredits({
        userId: user.id,
        amount: totalCredits,
        resourceId: videoId,
        reason: 'Failed to create video record — credits refunded',
        resourceType: 'veo_template_multi',
      }).catch(() => {})
      return NextResponse.json({ error: 'Failed to save video record' }, { status: 500 })
    }

    // Build segment data for the worker
    const workerSegments = typedSegments.map((seg, i) => ({
      index: i,
      prompt: seg.promptTemplate,
      duration: seg.duration,
      imageMode: seg.imageMode || null,
      label: seg.label || `Segment ${i + 1}`,
      status: 'pending' as const,
      videoUri: null,
    }))

    const segmentData = {
      type: 'template_multi' as const,
      segments: workerSegments,
      params: {
        aspectRatio: aspectRatio as VeoAspectRatio,
        model: model as VeoModel,
        generateAudio,
        negativePrompt: null,
        productImages: productImages || null,
      },
      composition: {
        userId: user.id,
        videoId,
        totalCredits,
        isStandard: true,
        storageBucket: 'exports',
        storagePath: `template-videos/${user.id}/${videoId}.mp4`,
      },
    }

    // Create job with segment data
    const { data: job } = await getSupabaseAdmin()
      .from('template_jobs')
      .insert({
        user_id: user.id,
        video_id: videoId,
        template_id: templateId,
        status: 'generating',
        total_segments: typedSegments.length,
        completed_segments: 0,
        segment_data: segmentData,
      })
      .select()
      .single()

    const jobId = job?.id

    // Trigger background worker (fire-and-forget)
    if (jobId) {
      triggerWorker(jobId)
    }

    // Return immediately — client polls /api/veo/template-job/[jobId]
    return NextResponse.json({ video: videoRecord, job: { id: jobId } })
  } catch (error) {
    console.error('Multi-generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate template video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
