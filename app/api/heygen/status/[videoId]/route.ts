import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getVideoStatus } from '@/lib/heygen'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId } = await params

    // Fetch the video record to verify ownership and get heygen_video_id
    const { data: video, error: dbError } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (dbError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // If already in a terminal state, just return it
    if (video.status === 'completed' || video.status === 'failed') {
      return NextResponse.json({ video })
    }

    // Poll HeyGen for latest status
    if (!video.heygen_video_id) {
      return NextResponse.json({ video })
    }

    const heygenStatus = await getVideoStatus(video.heygen_video_id)

    // Map HeyGen status to our status
    let newStatus = video.status
    if (heygenStatus.status === 'completed') {
      newStatus = 'completed'
    } else if (heygenStatus.status === 'failed') {
      newStatus = 'failed'
    } else if (heygenStatus.status === 'processing') {
      newStatus = 'processing'
    }

    // Update DB if status changed
    if (newStatus !== video.status || heygenStatus.video_url || heygenStatus.thumbnail_url) {
      const { data: updatedVideo } = await getSupabaseAdmin()
        .from('videos')
        .update({
          status: newStatus,
          video_url: heygenStatus.video_url || video.video_url,
          thumbnail_url: heygenStatus.thumbnail_url || video.thumbnail_url,
          duration: heygenStatus.duration || video.duration,
          error_message: heygenStatus.error || video.error_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId)
        .select()
        .single()

      return NextResponse.json({ video: updatedVideo })
    }

    return NextResponse.json({ video })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Failed to check video status' }, { status: 500 })
  }
}
