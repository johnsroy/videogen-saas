import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getVeoOperationStatus } from '@/lib/google-veo'

export const maxDuration = 300

/**
 * Admin endpoint to poll generating preview operations and download/store completed videos.
 * Call this periodically after generate-previews.
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-worker-secret')
  if (!secret || secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Get all generating jobs
  const { data: jobs } = await admin
    .from('template_preview_jobs')
    .select('*')
    .eq('status', 'generating')

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ message: 'No generating jobs to poll', polled: 0 })
  }

  const results: Array<{ templateId: string; status: string; previewUrl?: string }> = []

  for (const job of jobs) {
    if (!job.veo_operation_name) continue

    try {
      const status = await getVeoOperationStatus(job.veo_operation_name)

      if (status.error) {
        await admin
          .from('template_preview_jobs')
          .update({
            status: 'failed',
            error_message: status.error,
            updated_at: new Date().toISOString(),
          })
          .eq('template_id', job.template_id)

        results.push({ templateId: job.template_id, status: 'failed' })
        continue
      }

      if (status.done && status.videoUri) {
        // Download the video from Veo's temporary URI
        const videoRes = await fetch(status.videoUri)
        if (!videoRes.ok) throw new Error('Failed to download video from Veo')
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer())

        // Upload to Supabase storage
        const storagePath = `${job.template_id}.mp4`
        const { error: uploadErr } = await admin.storage
          .from('template-previews')
          .upload(storagePath, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true,
          })

        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

        const { data: { publicUrl } } = admin.storage
          .from('template-previews')
          .getPublicUrl(storagePath)

        // Update job with preview URL
        await admin
          .from('template_preview_jobs')
          .update({
            status: 'completed',
            preview_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('template_id', job.template_id)

        results.push({ templateId: job.template_id, status: 'completed', previewUrl: publicUrl })
      } else {
        results.push({ templateId: job.template_id, status: 'still_generating' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Poll failed'
      await admin
        .from('template_preview_jobs')
        .update({
          status: 'failed',
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq('template_id', job.template_id)

      results.push({ templateId: job.template_id, status: 'failed' })
    }
  }

  return NextResponse.json({ polled: results.length, results })
}
