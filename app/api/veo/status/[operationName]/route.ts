import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getVeoOperationStatus } from '@/lib/google-veo'
import { refundCredits } from '@/lib/credits'

const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes — auto-fail stuck operations

/**
 * Download a completed Veo video from Google and persist to Supabase Storage.
 * Google Generative AI file URLs expire within ~1 hour, so we must
 * download immediately and store permanently.
 */
async function persistVeoVideo(
  videoUri: string,
  userId: string,
  videoId: string
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_AI_API_KEY not set, cannot persist video')
    return null
  }

  try {
    const separator = videoUri.includes('?') ? '&' : '?'
    const authenticatedUrl = `${videoUri}${separator}key=${apiKey}`

    const res = await fetch(authenticatedUrl)
    if (!res.ok) {
      console.error('Failed to download Veo video from Google:', res.status)
      return null
    }

    const videoBytes = await res.arrayBuffer()
    const storagePath = `${userId}/${videoId}.mp4`

    const { error: uploadError } = await getSupabaseAdmin().storage
      .from('videos')
      .upload(storagePath, videoBytes, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) {
      console.error('Supabase Storage upload failed:', uploadError.message)
      return null
    }

    const { data: urlData } = getSupabaseAdmin().storage
      .from('videos')
      .getPublicUrl(storagePath)

    return urlData.publicUrl
  } catch (err) {
    console.error('persistVeoVideo error:', err)
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ operationName: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { operationName } = await params

    // Find video by veo_operation_name
    const { data: video } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('veo_operation_name', operationName)
      .eq('user_id', user.id)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // If already completed/failed, return cached status
    if (video.status === 'completed' || video.status === 'failed') {
      return NextResponse.json({ video })
    }

    // Check for timeout — if generation has been running longer than 15 min, auto-fail
    const createdAt = new Date(video.created_at).getTime()
    const elapsed = Date.now() - createdAt

    if (elapsed > TIMEOUT_MS) {
      const updates = {
        status: 'failed',
        error_message: 'Generation timed out after 15 minutes. Credits have been refunded.',
        updated_at: new Date().toISOString(),
      }

      await getSupabaseAdmin()
        .from('videos')
        .update(updates)
        .eq('id', video.id)
        .eq('user_id', user.id)

      // Refund credits
      if (video.credits_used > 0) {
        await refundCredits({
          userId: user.id,
          amount: video.credits_used,
          resourceId: video.id,
          reason: 'Generation timed out — auto-refund',
        })
      }

      return NextResponse.json({ video: { ...video, ...updates } })
    }

    // Poll Veo API
    const status = await getVeoOperationStatus(operationName)

    const updates: Record<string, unknown> = {}
    if (status.done && status.videoUri) {
      // Download from Google and persist to Supabase Storage (Google URLs expire in ~1 hour)
      const persistedUrl = await persistVeoVideo(status.videoUri, user.id, video.id)

      updates.status = 'completed'
      updates.video_url = persistedUrl ?? status.videoUri // fallback to Google URL if persist fails
      updates.updated_at = new Date().toISOString()

      if (!persistedUrl) {
        console.warn(`Video ${video.id}: failed to persist to storage, using ephemeral Google URL`)
      }
    } else if (status.done && status.error) {
      updates.status = 'failed'
      updates.error_message = status.error
      updates.updated_at = new Date().toISOString()

      // Refund credits on API-reported failure
      if (video.credits_used > 0) {
        await refundCredits({
          userId: user.id,
          amount: video.credits_used,
          resourceId: video.id,
          reason: 'Veo generation failed — auto-refund',
        })
      }
    } else if (!status.done) {
      updates.status = 'processing'
      updates.updated_at = new Date().toISOString()
    }

    if (Object.keys(updates).length > 0) {
      await getSupabaseAdmin()
        .from('videos')
        .update(updates)
        .eq('id', video.id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      video: { ...video, ...updates },
    })
  } catch (error) {
    console.error('Veo status check error:', error)
    const message = error instanceof Error ? error.message : 'Failed to check status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
