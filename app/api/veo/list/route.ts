import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: videos, error } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_veo')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Veo list error:', error)
      return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 })
    }

    return NextResponse.json({ videos: videos ?? [] })
  } catch (error) {
    console.error('Veo list error:', error)
    return NextResponse.json({ error: 'Failed to list videos' }, { status: 500 })
  }
}
