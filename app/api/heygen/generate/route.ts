import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVideo, listAvatars, listVoices } from '@/lib/heygen'

const DIMENSION_MAP: Record<string, { width: number; height: number }> = {
  '1280x720': { width: 1280, height: 720 },
  '720x1280': { width: 720, height: 1280 },
  '720x720': { width: 720, height: 720 },
}

function getFirstDayOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode, title, avatar_id, voice_id, script, prompt, dimension } = body

    // Validate mode
    if (!mode || !['avatar', 'prompt'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Validate script/prompt
    const finalScript = mode === 'avatar' ? script : prompt
    if (!finalScript || typeof finalScript !== 'string' || finalScript.trim().length === 0) {
      return NextResponse.json({ error: mode === 'avatar' ? 'Script is required' : 'Prompt is required' }, { status: 400 })
    }
    if (finalScript.length > 5000) {
      return NextResponse.json({ error: 'Text exceeds 5000 character limit' }, { status: 400 })
    }

    // Validate avatar/voice for avatar mode
    if (mode === 'avatar' && (!avatar_id || !voice_id)) {
      return NextResponse.json({ error: 'Avatar and voice are required for avatar mode' }, { status: 400 })
    }

    // Check usage limits
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const isProActive = subscription?.plan === 'pro' && subscription?.status === 'active'

    if (!isProActive) {
      const { count } = await getSupabaseAdmin()
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'failed')
        .gte('created_at', getFirstDayOfMonth())

      if ((count ?? 0) >= 5) {
        return NextResponse.json(
          { error: 'Monthly limit reached. Upgrade to Pro for unlimited videos.', code: 'LIMIT_REACHED' },
          { status: 403 }
        )
      }
    }

    // Resolve avatar/voice for prompt mode
    let finalAvatarId = avatar_id
    let finalVoiceId = voice_id
    if (mode === 'prompt') {
      const [avatars, voices] = await Promise.all([listAvatars(), listVoices()])
      finalAvatarId = avatars[0]?.avatar_id
      finalVoiceId = voices[0]?.voice_id
      if (!finalAvatarId || !finalVoiceId) {
        return NextResponse.json({ error: 'No avatars or voices available' }, { status: 500 })
      }
    }

    // Call HeyGen API
    const dimObj = dimension && DIMENSION_MAP[dimension] ? DIMENSION_MAP[dimension] : undefined
    const { video_id } = await generateVideo({
      avatar_id: finalAvatarId,
      voice_id: finalVoiceId,
      script: finalScript,
      dimension: dimObj,
    })

    // Insert into DB
    const { data: videoRecord, error: dbError } = await getSupabaseAdmin()
      .from('videos')
      .insert({
        user_id: user.id,
        heygen_video_id: video_id,
        title: title.trim(),
        mode,
        status: 'pending',
        avatar_id: finalAvatarId,
        voice_id: finalVoiceId,
        script: mode === 'avatar' ? script : null,
        prompt: mode === 'prompt' ? prompt : null,
        dimension: dimension || '1280x720',
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error inserting video:', dbError)
      return NextResponse.json({ error: 'Failed to save video record' }, { status: 500 })
    }

    return NextResponse.json({ video: videoRecord })
  } catch (error) {
    console.error('Generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate video'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
