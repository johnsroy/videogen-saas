import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const { data: job, error: dbError } = await getSupabaseAdmin()
      .from('template_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (dbError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // If completed, include the video record
    let video = null
    if (job.status === 'completed' && job.video_id) {
      const { data } = await getSupabaseAdmin()
        .from('videos')
        .select('*')
        .eq('id', job.video_id)
        .single()
      video = data
    }

    return NextResponse.json({
      status: job.status,
      total_segments: job.total_segments,
      completed_segments: job.completed_segments,
      current_segment_label: job.current_segment_label,
      error_message: job.error_message,
      video,
    })
  } catch (error) {
    console.error('Template job status error:', error)
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 })
  }
}
