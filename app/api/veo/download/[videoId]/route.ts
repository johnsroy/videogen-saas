import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId } = await params

    const { data: video } = await getSupabaseAdmin()
      .from('videos')
      .select('video_url, user_id, status, provider')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (video.status !== 'completed' || !video.video_url) {
      return NextResponse.json({ error: 'Video not ready' }, { status: 400 })
    }

    // For non-Veo videos (HeyGen etc.), redirect directly — their URLs are public
    if (video.provider !== 'google_veo') {
      return NextResponse.redirect(video.video_url)
    }

    // For Veo videos persisted to Supabase Storage, redirect — they're public
    if (video.video_url.includes('supabase.co/storage/')) {
      return NextResponse.redirect(video.video_url)
    }

    // Legacy: Veo videos with Google API URLs (expire in ~1 hour).
    // Proxy with API key authentication as fallback.
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const separator = video.video_url.includes('?') ? '&' : '?'
    const authenticatedUrl = `${video.video_url}${separator}key=${apiKey}`

    const googleRes = await fetch(authenticatedUrl)

    if (!googleRes.ok) {
      console.error('Google video fetch failed:', googleRes.status, await googleRes.text().catch(() => ''))
      return NextResponse.json(
        { error: 'Failed to fetch video from Google. The video may have expired.' },
        { status: 502 }
      )
    }

    const contentType = googleRes.headers.get('Content-Type') || 'video/mp4'
    const contentLength = googleRes.headers.get('Content-Length')

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    }
    if (contentLength) {
      headers['Content-Length'] = contentLength
    }

    return new Response(googleRes.body, { status: 200, headers })
  } catch (error) {
    console.error('Veo download error:', error)
    return NextResponse.json({ error: 'Failed to download video' }, { status: 500 })
  }
}
