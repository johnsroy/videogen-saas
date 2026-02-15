import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVeoVideo, getVeoOperationStatus, calculateVeoCreditCost } from '@/lib/google-veo'
import { getEffectivePlan, canUseVeo } from '@/lib/plan-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import { concatenateVideos } from '@/lib/ffmpeg-compose'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

export const maxDuration = 3600 // 1 hour for XLarge videos

const PARALLEL_LIMIT = 5
const VALID_DURATIONS: VeoDuration[] = [4, 6, 8]
const VALID_ASPECT_RATIOS: VeoAspectRatio[] = ['16:9', '9:16']
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BASE64_LENGTH = 15_000_000
const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 240 // 20 minutes max per segment

interface SegmentInput {
  promptTemplate: string
  duration: VeoDuration
  imageMode: 'reference' | 'start_frame'
  label: string
}

/** Run items in parallel with a concurrency limit */
async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
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

    // Create template job for progress tracking
    const { data: job, error: jobDbErr } = await getSupabaseAdmin()
      .from('template_jobs')
      .insert({
        user_id: user.id,
        video_id: videoId,
        template_id: templateId,
        status: 'generating',
        total_segments: typedSegments.length,
        completed_segments: 0,
      })
      .select()
      .single()

    if (jobDbErr) {
      console.error('Failed to create template job:', jobDbErr)
      // Non-fatal — continue without job tracking
    }

    const jobId = job?.id

    // Generate all segments in parallel with concurrency limit
    try {
      const videoUris = await parallelLimit(
        typedSegments,
        PARALLEL_LIMIT,
        async (seg, index) => {
          // Build image params based on imageMode
          const imageParams: Record<string, unknown> = {}
          if (productImages?.length > 0) {
            if (seg.imageMode === 'start_frame') {
              imageParams.startFrame = {
                base64: productImages[0].base64,
                mimeType: productImages[0].mimeType,
              }
            } else {
              imageParams.referenceImages = productImages.slice(0, 3).map(
                (img: { base64: string; mimeType: string }) => ({
                  base64: img.base64,
                  mimeType: img.mimeType,
                })
              )
            }
          }

          // Generate segment
          const result = await generateVeoVideo({
            prompt: seg.promptTemplate,
            ...imageParams,
            aspectRatio: aspectRatio as VeoAspectRatio,
            duration: seg.duration,
            generateAudio,
            model: model as VeoModel,
          })

          // Poll until done
          const videoUri = await pollUntilDone(result.operationName)

          // Update progress
          if (jobId) {
            await getSupabaseAdmin()
              .from('template_jobs')
              .update({
                completed_segments: index + 1,
                current_segment_label: seg.label,
                updated_at: new Date().toISOString(),
              })
              .eq('id', jobId)
              .eq('user_id', user.id)
          }

          return videoUri
        }
      )

      // Update job status to composing
      if (jobId) {
        await getSupabaseAdmin()
          .from('template_jobs')
          .update({ status: 'composing', updated_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('user_id', user.id)
      }

      // Concatenate all clips with 4K upscale
      const composedBuffer = await concatenateVideos(videoUris, {
        upscale4K: true,
        aspectRatio: aspectRatio as '16:9' | '9:16',
      })

      // Upload to Supabase storage
      if (jobId) {
        await getSupabaseAdmin()
          .from('template_jobs')
          .update({ status: 'uploading', updated_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('user_id', user.id)
      }

      const storagePath = `template-videos/${user.id}/${videoId}.mp4`
      const { error: uploadErr } = await getSupabaseAdmin().storage
        .from('exports')
        .upload(storagePath, composedBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        })

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      const { data: { publicUrl } } = getSupabaseAdmin().storage
        .from('exports')
        .getPublicUrl(storagePath)

      // Update video record
      await getSupabaseAdmin()
        .from('videos')
        .update({
          status: 'completed',
          video_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId)
        .eq('user_id', user.id)

      // Update job
      if (jobId) {
        await getSupabaseAdmin()
          .from('template_jobs')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('user_id', user.id)
      }

      // Fetch final video
      const { data: finalVideo } = await getSupabaseAdmin()
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single()

      return NextResponse.json({ video: finalVideo, job: { id: jobId } })
    } catch (genError) {
      console.error('Multi-generate error:', genError)

      // Refund all credits
      await refundCredits({
        userId: user.id,
        amount: totalCredits,
        resourceId: videoId,
        reason: 'Template video generation failed — credits refunded',
        resourceType: 'veo_template_multi',
      }).catch(() => {})

      // Update records
      await getSupabaseAdmin()
        .from('videos')
        .update({
          status: 'failed',
          error_message: genError instanceof Error ? genError.message : 'Generation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId)
        .eq('user_id', user.id)

      if (jobId) {
        await getSupabaseAdmin()
          .from('template_jobs')
          .update({
            status: 'failed',
            error_message: genError instanceof Error ? genError.message : 'Generation failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('user_id', user.id)
      }

      const raw = genError instanceof Error ? genError.message : String(genError)
      if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429') || raw.includes('quota')) {
        return NextResponse.json(
          { error: 'Google Veo API quota exceeded. Please wait a few minutes and try again.' },
          { status: 429 }
        )
      }

      return NextResponse.json({ error: raw || 'Failed to generate template video' }, { status: 500 })
    }
  } catch (error) {
    console.error('Multi-generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate template video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
