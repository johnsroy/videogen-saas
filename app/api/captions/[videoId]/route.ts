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

    const { data: caption } = await getSupabaseAdmin()
      .from('captions')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .single()

    if (!caption) {
      return NextResponse.json({ caption: null })
    }

    return NextResponse.json({ caption })
  } catch (error) {
    console.error('Fetch caption error:', error)
    return NextResponse.json({ error: 'Failed to fetch captions' }, { status: 500 })
  }
}

export async function PUT(
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
    const body = await request.json()
    const { content, styles } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Caption content is required' }, { status: 400 })
    }

    // Upsert caption
    const { data: existing } = await getSupabaseAdmin()
      .from('captions')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      await getSupabaseAdmin()
        .from('captions')
        .update({ content, styles: styles || {} })
        .eq('id', existing.id)
        .eq('user_id', user.id)
      return NextResponse.json({ success: true, captionId: existing.id })
    } else {
      const { data: inserted } = await getSupabaseAdmin()
        .from('captions')
        .insert({
          video_id: videoId,
          user_id: user.id,
          content,
          styles: styles || {},
        })
        .select('id')
        .single()
      return NextResponse.json({ success: true, captionId: inserted?.id })
    }
  } catch (error) {
    console.error('Save caption error:', error)
    return NextResponse.json({ error: 'Failed to save captions' }, { status: 500 })
  }
}
