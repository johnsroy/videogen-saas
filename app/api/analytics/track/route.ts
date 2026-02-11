import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { parseUserAgent, parseDomain } from '@/lib/user-agent'
import type { ViewEvent } from '@/lib/analytics-types'

export async function POST(request: Request) {
  try {
    const body: ViewEvent = await request.json()
    const { event, share_id, session_id } = body

    if (!share_id || !session_id || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const headers = request.headers
    const ua = headers.get('user-agent') || ''
    const country = headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry') || null

    if (event === 'view_start') {
      // Look up the share to get video_id and user_id
      const { data: share } = await admin
        .from('video_shares')
        .select('video_id, user_id')
        .eq('share_id', share_id)
        .eq('is_active', true)
        .single()

      if (!share) {
        return NextResponse.json({ error: 'Share not found' }, { status: 404 })
      }

      // Get video duration
      const { data: video } = await admin
        .from('videos')
        .select('duration')
        .eq('id', share.video_id)
        .single()

      const parsed = parseUserAgent(ua)
      const referrer = body.referrer || null
      const referrer_domain = referrer ? parseDomain(referrer) : null

      const { data: view, error } = await admin
        .from('video_views')
        .insert({
          share_id,
          video_id: share.video_id,
          user_id: share.user_id,
          session_id,
          video_duration_seconds: video?.duration || 0,
          referrer,
          referrer_domain,
          country,
          device_type: parsed.device_type,
          browser: parsed.browser,
          os: parsed.os,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Track view_start error:', error)
        return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
      }

      return NextResponse.json({ view_id: view.id })
    }

    if (event === 'view_ping' || event === 'view_end') {
      const { view_id, watch_duration_seconds, video_duration_seconds } = body

      if (!view_id) {
        return NextResponse.json({ error: 'view_id required for ping/end' }, { status: 400 })
      }

      const watchDuration = watch_duration_seconds || 0
      const videoDuration = video_duration_seconds || 1
      const completionRate = Math.min(watchDuration / videoDuration, 1)

      await admin
        .from('video_views')
        .update({
          watch_duration_seconds: watchDuration,
          completion_rate: completionRate,
          last_ping_at: new Date().toISOString(),
        })
        .eq('id', view_id)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
  } catch (error) {
    console.error('Track error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
