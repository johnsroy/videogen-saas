import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { composeVideo } from '@/lib/ffmpeg-compose'
import { consumeCredits, refundCredits, EXPORT_CREDIT_COST } from '@/lib/credits'

export const maxDuration = 300 // 5 min timeout for video processing

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    // Load project
    const { data: project } = await getSupabaseAdmin()
      .from('edit_projects')
      .select('*')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Load source video
    const { data: sourceVideo } = await getSupabaseAdmin()
      .from('videos')
      .select('*')
      .eq('id', project.source_video_id)
      .single()

    if (!sourceVideo || !sourceVideo.video_url) {
      return NextResponse.json({ error: 'Source video not found or has no URL' }, { status: 404 })
    }

    // Consume credits FIRST (atomic — prevents double-spend)
    const exportId = crypto.randomUUID()
    const creditResult = await consumeCredits({
      userId: user.id,
      amount: EXPORT_CREDIT_COST,
      resourceType: 'video_export',
      resourceId: exportId,
      description: `Exported edited video from "${sourceVideo.title}"`,
    })

    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: `Need ${EXPORT_CREDIT_COST} credits to export. You have ${creditResult.remaining}.`,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 403 }
      )
    }

    // Set status to exporting
    await getSupabaseAdmin()
      .from('edit_projects')
      .update({ status: 'exporting', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', project_id)

    // Fetch voiceover URL if set
    let voiceoverUrl: string | undefined
    if (project.voiceover_id) {
      const { data: vo } = await getSupabaseAdmin()
        .from('voiceovers')
        .select('audio_url')
        .eq('id', project.voiceover_id)
        .single()
      voiceoverUrl = vo?.audio_url || undefined
    }

    // Fetch music URL
    let musicUrl: string | undefined
    if (project.music_ai_id) {
      const { data: track } = await getSupabaseAdmin()
        .from('ai_music_tracks')
        .select('audio_url')
        .eq('id', project.music_ai_id)
        .single()
      musicUrl = track?.audio_url || undefined
    } else if (project.music_preset_id) {
      // Preset tracks are local files in public/audio/
      const presetMap: Record<string, string> = {
        upbeat: 'upbeat.wav',
        corporate: 'corporate.wav',
        calm: 'calm.wav',
        energetic: 'energetic.wav',
      }
      const presetFile = presetMap[project.music_preset_id]
      if (presetFile) {
        // Use NEXT_PUBLIC_APP_URL if available, otherwise construct from request
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
          || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
          || `http://localhost:${process.env.PORT || 3000}`
        musicUrl = `${appUrl}/audio/${presetFile}`
      }
    }

    try {
      // Compose video with real FFmpeg binary
      const composedBuffer = await composeVideo({
        sourceVideoUrl: sourceVideo.video_url,
        voiceoverUrl,
        voiceoverVolume: project.voiceover_volume,
        captionVtt: project.caption_content || undefined,
        captionStyles: project.caption_styles || undefined,
        musicUrl,
        musicVolume: project.music_volume,
        originalAudioVolume: project.original_audio_volume,
      })

      // Upload to exports bucket
      const storagePath = `${user.id}/${exportId}.mp4`

      const { error: uploadError } = await getSupabaseAdmin()
        .storage
        .from('exports')
        .upload(storagePath, composedBuffer, {
          contentType: 'video/mp4',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      const { data: urlData } = getSupabaseAdmin()
        .storage
        .from('exports')
        .getPublicUrl(storagePath)

      // Create new video record
      const { data: newVideo, error: videoError } = await getSupabaseAdmin()
        .from('videos')
        .insert({
          id: exportId,
          user_id: user.id,
          title: `${project.title} (Edited)`,
          mode: sourceVideo.mode,
          status: 'completed',
          video_url: urlData.publicUrl,
          thumbnail_url: sourceVideo.thumbnail_url,
          duration: sourceVideo.duration,
          dimension: sourceVideo.dimension,
          provider: 'edited',
          parent_video_id: sourceVideo.id,
          script: sourceVideo.script,
          prompt: sourceVideo.prompt,
          credits_used: EXPORT_CREDIT_COST,
        })
        .select()
        .single()

      if (videoError) {
        throw new Error(`Video record creation failed: ${videoError.message}`)
      }

      // Update project status
      await getSupabaseAdmin()
        .from('edit_projects')
        .update({
          status: 'completed',
          exported_video_id: exportId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project_id)

      return NextResponse.json({ video: newVideo })
    } catch (composeError) {
      // Composition failed — refund credits
      await refundCredits({
        userId: user.id,
        amount: EXPORT_CREDIT_COST,
        resourceId: exportId,
        reason: 'Video export failed — credits refunded',
      }).catch(() => {}) // Don't let refund failure mask the original error

      // Mark project as failed
      const errMsg = composeError instanceof Error ? composeError.message : 'Composition failed'
      await getSupabaseAdmin()
        .from('edit_projects')
        .update({
          status: 'failed',
          error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project_id)

      console.error('Compose error:', composeError)
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export video' }, { status: 500 })
  }
}
