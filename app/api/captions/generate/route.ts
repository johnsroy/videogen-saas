import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateWebVTT } from '@/lib/captions'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { video_id } = body

    if (!video_id || typeof video_id !== 'string') {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 })
    }

    // Fetch video and verify ownership
    const { data: video, error: videoError } = await getSupabaseAdmin()
      .from('videos')
      .select('id, user_id, script, prompt, duration, status')
      .eq('id', video_id)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (video.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (video.status !== 'completed') {
      return NextResponse.json({ error: 'Video must be completed to generate captions' }, { status: 400 })
    }

    const scriptText = video.script || video.prompt
    if (!scriptText) {
      return NextResponse.json({ error: 'No script available for this video' }, { status: 400 })
    }

    const duration = video.duration || 60 // Default to 60s if unknown
    const vttContent = generateWebVTT(scriptText, duration)

    // Upsert caption (replace if exists)
    const { data: caption, error: captionError } = await getSupabaseAdmin()
      .from('captions')
      .upsert(
        {
          video_id: video.id,
          user_id: user.id,
          content: vttContent,
        },
        { onConflict: 'video_id' }
      )
      .select()
      .single()

    if (captionError) {
      console.error('Caption insert error:', captionError)
      return NextResponse.json({ error: 'Failed to save captions' }, { status: 500 })
    }

    return NextResponse.json({ caption })
  } catch (error) {
    console.error('Generate captions error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate captions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
