import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params

    const { data: project } = await getSupabaseAdmin()
      .from('edit_projects')
      .select('id, status, error_message, exported_video_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let exportedVideo = null
    if (project.exported_video_id) {
      const { data } = await getSupabaseAdmin()
        .from('videos')
        .select('id, title, video_url, thumbnail_url, status')
        .eq('id', project.exported_video_id)
        .single()
      exportedVideo = data
    }

    return NextResponse.json({
      project: {
        id: project.id,
        status: project.status,
        error_message: project.error_message,
        exported_video: exportedVideo,
      },
    })
  } catch (error) {
    console.error('Export status error:', error)
    return NextResponse.json({ error: 'Failed to check export status' }, { status: 500 })
  }
}
