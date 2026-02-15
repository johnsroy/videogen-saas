import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVeoVideo, getVeoOperationStatus } from '@/lib/google-veo'
import type { VeoGenerateParams } from '@/lib/veo-types'
import { refundCredits } from '@/lib/credits'
import { concatenateVideos } from '@/lib/ffmpeg-compose'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

export const maxDuration = 800 // Vercel Pro max

const PARALLEL_LIMIT = 5
const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 240
// Leave 60s buffer before timeout to save progress and chain
const TIME_BUDGET_MS = 700_000

/** Segment stored in segment_data JSONB */
interface StoredSegment {
  index: number
  prompt: string
  duration: VeoDuration
  imageMode?: 'reference' | 'start_frame' | null
  label: string
  status: 'pending' | 'completed' | 'failed'
  videoUri?: string | null
}

interface SegmentData {
  type: 'extended' | 'template_multi' | 'extension_multi'
  /** Original video URL to prepend (for extension_multi type) */
  originalVideoUrl?: string
  segments: StoredSegment[]
  params: {
    aspectRatio: VeoAspectRatio
    model: VeoModel
    generateAudio: boolean
    negativePrompt?: string | null
    productImages?: Array<{ base64: string; mimeType: string }> | null
  }
  composition: {
    userId: string
    videoId: string
    totalCredits: number
    isStandard: boolean
    storageBucket: string
    storagePath: string
  }
}

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

/** Trigger the next worker invocation (fire-and-forget) */
function chainWorker(jobId: string) {
  const url = `${getAppUrl()}/api/veo/worker`
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    body: JSON.stringify({ jobId }),
  }).catch((err) => {
    console.error('Failed to chain worker:', err)
  })
}

export async function POST(request: Request) {
  // Authenticate — only internal calls allowed
  const secret = request.headers.get('x-worker-secret')
  if (!secret || secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await request.json()
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Load job
  const { data: job, error: jobErr } = await admin
    .from('template_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return NextResponse.json({ status: job.status })
  }

  const segmentData = job.segment_data as SegmentData
  if (!segmentData?.segments) {
    return NextResponse.json({ error: 'No segment data' }, { status: 400 })
  }

  const { segments, params, composition } = segmentData
  const pendingSegments = segments.filter((s) => s.status === 'pending')

  // All segments complete — compose the final video
  if (pendingSegments.length === 0) {
    try {
      await admin
        .from('template_jobs')
        .update({ status: 'composing', updated_at: new Date().toISOString() })
        .eq('id', jobId)

      const completedSegments = [...segments].sort((a, b) => a.index - b.index)
      const segmentUris = completedSegments.map((s) => s.videoUri!).filter(Boolean)

      // For extension_multi: prepend original video before new segments
      const videoUris = segmentData.type === 'extension_multi' && segmentData.originalVideoUrl
        ? [segmentData.originalVideoUrl, ...segmentUris]
        : segmentUris

      const composedBuffer = await concatenateVideos(videoUris, {
        upscale4K: composition.isStandard,
        aspectRatio: params.aspectRatio as '16:9' | '9:16',
      })

      await admin
        .from('template_jobs')
        .update({ status: 'uploading', updated_at: new Date().toISOString() })
        .eq('id', jobId)

      const { error: uploadErr } = await admin.storage
        .from(composition.storageBucket)
        .upload(composition.storagePath, composedBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        })

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

      const {
        data: { publicUrl },
      } = admin.storage.from(composition.storageBucket).getPublicUrl(composition.storagePath)

      await admin
        .from('videos')
        .update({
          status: 'completed',
          video_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', composition.videoId)
        .eq('user_id', composition.userId)

      await admin
        .from('template_jobs')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', jobId)

      return NextResponse.json({ status: 'completed' })
    } catch (composeErr) {
      console.error('Worker compose error:', composeErr)
      const msg = composeErr instanceof Error ? composeErr.message : 'Composition failed'

      await admin
        .from('template_jobs')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', jobId)

      await admin
        .from('videos')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', composition.videoId)
        .eq('user_id', composition.userId)

      await refundCredits({
        userId: composition.userId,
        amount: composition.totalCredits,
        resourceId: composition.videoId,
        reason: 'Video composition failed — credits refunded',
        resourceType: segmentData.type,
      }).catch(() => {})

      return NextResponse.json({ status: 'failed', error: msg })
    }
  }

  // Process a batch of pending segments within the time budget
  const startTime = Date.now()
  let completedInBatch = 0
  let failedFatally = false

  // Process segments in parallel batches
  while (true) {
    const elapsed = Date.now() - startTime
    if (elapsed > TIME_BUDGET_MS) break

    const remaining = segments.filter((s) => s.status === 'pending')
    if (remaining.length === 0) break

    // Take a batch up to PARALLEL_LIMIT
    const batch = remaining.slice(0, PARALLEL_LIMIT)

    try {
      const results = await Promise.allSettled(
        batch.map(async (seg) => {
          // Build generation params
          const genParams: VeoGenerateParams = {
            prompt: seg.prompt,
            aspectRatio: params.aspectRatio,
            duration: seg.duration,
            generateAudio: params.generateAudio,
            model: params.model,
          }

          if (params.negativePrompt) {
            genParams.negativePrompt = params.negativePrompt
          }

          // Add images for template mode
          if (params.productImages?.length && seg.imageMode) {
            if (seg.imageMode === 'start_frame') {
              genParams.startFrame = {
                base64: params.productImages[0].base64,
                mimeType: params.productImages[0].mimeType,
              }
            } else {
              genParams.referenceImages = params.productImages.slice(0, 3).map((img) => ({
                base64: img.base64,
                mimeType: img.mimeType,
              }))
            }
          }

          const result = await generateVeoVideo(genParams)
          const videoUri = await pollUntilDone(result.operationName)
          return { index: seg.index, videoUri }
        })
      )

      // Update segment statuses
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { index, videoUri } = result.value
          const seg = segments.find((s) => s.index === index)
          if (seg) {
            seg.status = 'completed'
            seg.videoUri = videoUri
            completedInBatch++
          }
        } else {
          // Mark individual segment as failed but continue
          const errMsg = result.reason?.message || 'Segment generation failed'
          console.error(`Segment failed: ${errMsg}`)

          // If quota exhausted, stop the whole batch
          if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
            failedFatally = true
            break
          }
        }
      }

      // Save progress after each batch
      const totalCompleted = segments.filter((s) => s.status === 'completed').length
      await admin
        .from('template_jobs')
        .update({
          segment_data: segmentData,
          completed_segments: totalCompleted,
          current_segment_label: `Clip ${totalCompleted}/${segments.length}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      if (failedFatally) break
    } catch (batchErr) {
      console.error('Worker batch error:', batchErr)
      failedFatally = true
      break
    }
  }

  // Check final state
  const totalCompleted = segments.filter((s) => s.status === 'completed').length
  const totalPending = segments.filter((s) => s.status === 'pending').length

  if (failedFatally && totalCompleted === 0) {
    // Complete failure — refund and mark failed
    await admin
      .from('template_jobs')
      .update({
        status: 'failed',
        segment_data: segmentData,
        error_message: 'Video generation failed (API quota or error)',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await admin
      .from('videos')
      .update({
        status: 'failed',
        error_message: 'Video generation failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', composition.videoId)
      .eq('user_id', composition.userId)

    await refundCredits({
      userId: composition.userId,
      amount: composition.totalCredits,
      resourceId: composition.videoId,
      reason: 'Video generation failed — credits refunded',
      resourceType: segmentData.type,
    }).catch(() => {})

    return NextResponse.json({ status: 'failed' })
  }

  if (totalPending > 0) {
    // More segments to process — chain to next worker invocation
    chainWorker(jobId)
    return NextResponse.json({
      status: 'processing',
      completed: totalCompleted,
      remaining: totalPending,
    })
  }

  // All segments done — chain one more time to trigger composition
  chainWorker(jobId)
  return NextResponse.json({ status: 'composing', completed: totalCompleted })
}
