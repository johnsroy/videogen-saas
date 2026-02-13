import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImageStatus } from '@/lib/nanobanana-pro'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params

    // Verify task belongs to user
    const { data: task } = await getSupabaseAdmin()
      .from('nb_image_tasks')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .single()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // If already completed/failed, return cached status
    if (task.status === 'completed' || task.status === 'failed') {
      return NextResponse.json({ task })
    }

    // Poll NanoBanana API
    const status = await getImageStatus(taskId)

    const updates: Record<string, unknown> = {}
    if (status.status === 'COMPLETED') {
      updates.status = 'completed'
      updates.image_urls = status.imageUrls ?? []
      updates.updated_at = new Date().toISOString()
    } else if (status.status === 'FAILED') {
      updates.status = 'failed'
      updates.error_message = status.error ?? 'Generation failed'
      updates.updated_at = new Date().toISOString()
    } else if (status.status === 'PROCESSING') {
      updates.status = 'processing'
      updates.updated_at = new Date().toISOString()
    }

    if (Object.keys(updates).length > 0) {
      await getSupabaseAdmin()
        .from('nb_image_tasks')
        .update(updates)
        .eq('id', task.id)
    }

    return NextResponse.json({
      task: { ...task, ...updates },
    })
  } catch (error) {
    console.error('NanoBanana image status error:', error)
    const message = error instanceof Error ? error.message : 'Failed to check status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
