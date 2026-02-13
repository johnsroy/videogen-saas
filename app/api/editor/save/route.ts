import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      source_video_id,
      title,
      voiceover_id,
      voiceover_volume,
      caption_content,
      caption_styles,
      music_preset_id,
      music_ai_id,
      music_volume,
      original_audio_volume,
    } = body

    if (!source_video_id || !title) {
      return NextResponse.json({ error: 'source_video_id and title are required' }, { status: 400 })
    }

    // Verify video belongs to user
    const { data: video } = await getSupabaseAdmin()
      .from('videos')
      .select('id')
      .eq('id', source_video_id)
      .eq('user_id', user.id)
      .single()

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Check if project already exists for this video
    const { data: existing } = await getSupabaseAdmin()
      .from('edit_projects')
      .select('id')
      .eq('source_video_id', source_video_id)
      .eq('user_id', user.id)
      .single()

    const projectData = {
      user_id: user.id,
      source_video_id,
      title,
      voiceover_id: voiceover_id || null,
      voiceover_volume: voiceover_volume ?? 100,
      caption_content: caption_content || null,
      caption_styles: caption_styles || {},
      music_preset_id: music_preset_id || null,
      music_ai_id: music_ai_id || null,
      music_volume: music_volume ?? 30,
      original_audio_volume: original_audio_volume ?? 100,
      updated_at: new Date().toISOString(),
    }

    let project
    if (existing) {
      const { data, error } = await getSupabaseAdmin()
        .from('edit_projects')
        .update(projectData)
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) throw error
      project = data
    } else {
      const { data, error } = await getSupabaseAdmin()
        .from('edit_projects')
        .insert(projectData)
        .select()
        .single()
      if (error) throw error
      project = data
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Editor save error:', error)
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 })
  }
}
