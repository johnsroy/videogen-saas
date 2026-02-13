import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { refundCredits } from '@/lib/credits'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId } = await request.json()

    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    // Find video — must belong to user and be cancellable
    const { data: video } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (video.status !== 'pending' && video.status !== 'processing') {
      return NextResponse.json(
        { error: 'Only pending or processing videos can be cancelled' },
        { status: 400 }
      )
    }

    // Mark as failed
    const updates = {
      status: 'failed',
      error_message: 'Cancelled by user. Credits have been refunded.',
      updated_at: new Date().toISOString(),
    }

    await getSupabaseAdmin()
      .from('videos')
      .update(updates)
      .eq('id', video.id)
      .eq('user_id', user.id)

    // Refund credits
    if (video.credits_used > 0) {
      await refundCredits({
        userId: user.id,
        amount: video.credits_used,
        resourceId: video.id,
        reason: 'Cancelled by user — refund',
      })
    }

    return NextResponse.json({ video: { ...video, ...updates } })
  } catch (error) {
    console.error('Veo cancel error:', error)
    const message = error instanceof Error ? error.message : 'Failed to cancel video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
