import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(
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

    // Find video — must belong to user
    const { data: video } = await getSupabaseAdmin()
      .from('videos')
      .select('id, user_id, status, video_url, provider')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Only allow deleting completed or failed videos
    if (video.status === 'pending' || video.status === 'processing') {
      return NextResponse.json(
        { error: 'Cancel the video first before deleting it.' },
        { status: 400 }
      )
    }

    // Delete from Supabase Storage if persisted there
    if (video.video_url?.includes('supabase.co/storage/')) {
      const storagePath = `${user.id}/${videoId}.mp4`
      await getSupabaseAdmin().storage
        .from('videos')
        .remove([storagePath])
    }

    // Delete DB record
    await getSupabaseAdmin()
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Video delete error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
