import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { video_id } = await request.json()

    if (!video_id || typeof video_id !== 'string') {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 })
    }

    // Verify user owns this video
    const { data: video } = await supabase
      .from('videos')
      .select('id, status')
      .eq('id', video_id)
      .eq('user_id', user.id)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (video.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed videos can be shared' }, { status: 400 })
    }

    // Check if an active share already exists
    const { data: existingShare } = await supabase
      .from('video_shares')
      .select('share_id')
      .eq('video_id', video_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (existingShare) {
      const origin = request.headers.get('origin') || ''
      return NextResponse.json({
        share_id: existingShare.share_id,
        share_url: `${origin}/v/${existingShare.share_id}`,
      })
    }

    // Create new share
    const share_id = nanoid(10)

    const { error } = await getSupabaseAdmin()
      .from('video_shares')
      .insert({
        video_id,
        user_id: user.id,
        share_id,
      })

    if (error) {
      console.error('Create share error:', error)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    const origin = request.headers.get('origin') || ''
    return NextResponse.json({
      share_id,
      share_url: `${origin}/v/${share_id}`,
    })
  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
