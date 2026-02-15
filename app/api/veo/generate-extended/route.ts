import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVeoVideo, getVeoOperationStatus, calculateVeoCreditCost } from '@/lib/google-veo'
import { getEffectivePlan, canUseVeo } from '@/lib/plan-utils'
import { consumeCredits, refundCredits } from '@/lib/credits'
import { concatenateVideos } from '@/lib/ffmpeg-compose'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

export const maxDuration = 600 // 10 minutes max for extended generation

const PARALLEL_LIMIT = 5
const VALID_EXTENDED_DURATIONS = [4, 6, 8, 15, 30, 60, 120]
const VALID_ASPECT_RATIOS: VeoAspectRatio[] = ['16:9', '9:16']
const VALID_MODELS: VeoModel[] = ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']
const SEGMENT_DURATION: VeoDuration = 8 // Each segment is 8 seconds
const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 240 // 20 minutes max per segment

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

    // For short durations (<=8s), use standard single-clip flow
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

        const dimension = aspectRatio === '9:16' ? '720x1280' : '1280x720'
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
            dimension,
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

    // Extended duration — multi-segment generation
    const numSegments = Math.ceil(duration / SEGMENT_DURATION)
    const totalCredits = calculateVeoCreditCost(duration, model as VeoModel)
    const videoId = crypto.randomUUID()

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
    const isStandard = model === 'veo-3.1-generate-preview'
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

    // Create job for progress tracking
    const { data: job } = await getSupabaseAdmin()
      .from('template_jobs')
      .insert({
        user_id: user.id,
        video_id: videoId,
        template_id: 'extended_text_to_video',
        status: 'generating',
        total_segments: numSegments,
        completed_segments: 0,
      })
      .select()
      .single()

    const jobId = job?.id

    // Build segment prompts
    const segmentPrompts: string[] = []
    for (let i = 0; i < numSegments; i++) {
      if (i === 0) {
        segmentPrompts.push(prompt.trim())
      } else {
        segmentPrompts.push(
          `Continuation of the scene: ${prompt.trim()}. Maintain visual consistency, smooth transition, and continuous flow from the previous shot. Segment ${i + 1} of ${numSegments}.`
        )
      }
    }

    try {
      // Generate all segments in parallel
      const videoUris = await parallelLimit(
        segmentPrompts,
        PARALLEL_LIMIT,
        async (segPrompt, index) => {
          const result = await generateVeoVideo({
            prompt: segPrompt,
            aspectRatio: aspectRatio as VeoAspectRatio,
            duration: SEGMENT_DURATION,
            generateAudio,
            negativePrompt: negativePrompt?.trim() || undefined,
            model: model as VeoModel,
          })

          const videoUri = await pollUntilDone(result.operationName)

          // Update progress
          if (jobId) {
            await getSupabaseAdmin()
              .from('template_jobs')
              .update({
                completed_segments: index + 1,
                current_segment_label: `Clip ${index + 1}`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', jobId)
              .eq('user_id', user.id)
          }

          return videoUri
        }
      )

      // Compose clips
      if (jobId) {
        await getSupabaseAdmin()
          .from('template_jobs')
          .update({ status: 'composing', updated_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('user_id', user.id)
      }

      const composedBuffer = await concatenateVideos(videoUris, {
        upscale4K: isStandard,
        aspectRatio: aspectRatio as '16:9' | '9:16',
      })

      // Upload
      if (jobId) {
        await getSupabaseAdmin()
          .from('template_jobs')
          .update({ status: 'uploading', updated_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('user_id', user.id)
      }

      const storagePath = `extended-videos/${user.id}/${videoId}.mp4`
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

      if (jobId) {
        await getSupabaseAdmin()
          .from('template_jobs')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('user_id', user.id)
      }

      const { data: finalVideo } = await getSupabaseAdmin()
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single()

      return NextResponse.json({ video: finalVideo, job: { id: jobId } })
    } catch (genError) {
      console.error('Extended generate error:', genError)

      await refundCredits({
        userId: user.id,
        amount: totalCredits,
        resourceId: videoId,
        reason: 'Extended video generation failed — credits refunded',
        resourceType: 'veo_extended',
      }).catch(() => {})

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

      return NextResponse.json({ error: raw || 'Failed to generate extended video' }, { status: 500 })
    }
  } catch (error) {
    console.error('Extended generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate extended video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
