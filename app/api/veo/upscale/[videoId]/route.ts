import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { upscaleVideoTo4K } from '@/lib/ffmpeg-compose'

export const maxDuration = 600 // 10 minutes

export async function POST(
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

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Fetch the video
    const { data: video } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found or not completed' }, { status: 404 })
    }

    if (!video.video_url) {
      return NextResponse.json({ error: 'Video has no URL' }, { status: 400 })
    }

    // Check if already 4K
    if (video.dimension === '3840x2160' || video.dimension === '2160x3840') {
      return NextResponse.json({ error: 'Video is already 4K' }, { status: 400 })
    }

    // Determine aspect ratio from dimension
    const aspectRatio: '16:9' | '9:16' =
      video.dimension === '720x1280' || video.dimension === '1080x1920'
        ? '9:16'
        : '16:9'

    // Upscale to 4K
    const upscaledBuffer = await upscaleVideoTo4K(video.video_url, aspectRatio)

    // Upload to storage
    const storagePath = `template-videos/${user.id}/${videoId}_4k.mp4`
    const { error: uploadErr } = await getSupabaseAdmin().storage
      .from('exports')
      .upload(storagePath, upscaledBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = getSupabaseAdmin().storage
      .from('exports')
      .getPublicUrl(storagePath)

    // Update video record with 4K URL and dimension
    const newDimension = aspectRatio === '9:16' ? '2160x3840' : '3840x2160'
    await getSupabaseAdmin()
      .from('videos')
      .update({
        video_url: publicUrl,
        dimension: newDimension,
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId)
      .eq('user_id', user.id)

    const { data: updatedVideo } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    return NextResponse.json({ video: updatedVideo })
  } catch (error) {
    console.error('Upscale error:', error)
    const message = error instanceof Error ? error.message : 'Failed to upscale video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
