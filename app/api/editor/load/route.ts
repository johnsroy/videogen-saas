import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceVideoId = searchParams.get('source_video_id')

    if (!sourceVideoId) {
      return NextResponse.json({ error: 'source_video_id is required' }, { status: 400 })
    }

    const { data: project } = await getSupabaseAdmin()
      .from('edit_projects')
      .select('*')
      .eq('source_video_id', sourceVideoId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ project: null })
    }

    // Fetch joined data
    let voiceover = null
    if (project.voiceover_id) {
      const { data } = await getSupabaseAdmin()
        .from('voiceovers')
        .select('id, audio_url, voice, duration_seconds')
        .eq('id', project.voiceover_id)
        .single()
      voiceover = data
    }

    let aiMusic = null
    if (project.music_ai_id) {
      const { data } = await getSupabaseAdmin()
        .from('ai_music_tracks')
        .select('id, audio_url, prompt, duration_seconds')
        .eq('id', project.music_ai_id)
        .single()
      aiMusic = data
    }

    return NextResponse.json({
      project: { ...project, voiceover, ai_music: aiMusic },
    })
  } catch (error) {
    console.error('Editor load error:', error)
    return NextResponse.json({ error: 'Failed to load project' }, { status: 500 })
  }
}
