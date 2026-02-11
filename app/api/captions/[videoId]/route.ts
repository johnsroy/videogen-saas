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
