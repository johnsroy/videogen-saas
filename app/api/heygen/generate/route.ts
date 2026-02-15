import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVideo, listAvatars, listVoices } from '@/lib/heygen'
import { generateVeoVideo } from '@/lib/google-veo'
import { getEffectivePlan, canGenerateVideo, getVideoLimit, canUseVeo } from '@/lib/plan-utils'
import { consumeCredits } from '@/lib/credits'

const DIMENSION_MAP: Record<string, { width: number; height: number }> = {
  '1280x720': { width: 1280, height: 720 },
  '720x1280': { width: 720, height: 1280 },
  '720x720': { width: 720, height: 720 },
}

const ASPECT_RATIO_MAP: Record<string, string> = {
  '1280x720': '16:9',
  '720x1280': '9:16',
  '720x720': '1:1',
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
    const admin = getSupabaseAdmin()
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const planId = getEffectivePlan(subscription?.plan, subscription?.status)
    const videoLimit = getVideoLimit(planId)

    if (videoLimit !== null) {
      const { count } = await admin
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'failed')
        .gte('created_at', getFirstDayOfMonth())

      if (!canGenerateVideo(planId, count ?? 0)) {
        return NextResponse.json(
          { error: `Monthly limit of ${videoLimit} videos reached. Upgrade your plan for more.`, code: 'LIMIT_REACHED' },
          { status: 403 }
        )
      }
    }

    // Check if this is a custom avatar (uses Veo 3.1 instead of HeyGen)
    const isCustomAvatar = typeof avatar_id === 'string' && avatar_id.startsWith('custom_')

    if (isCustomAvatar) {
      // Custom avatars use Veo 3.1 image-to-video
      if (!canUseVeo(planId)) {
        return NextResponse.json(
          { error: 'AI Video features require a paid plan. Upgrade to use custom avatars.' },
          { status: 403 }
        )
      }

      // Fetch custom avatar photo from DB
      const customId = avatar_id.replace('custom_', '')
      const { data: customAvatar } = await admin
        .from('custom_avatars')
        .select('photo_url')
        .eq('id', customId)
        .eq('user_id', user.id)
        .single()

      if (!customAvatar?.photo_url) {
        return NextResponse.json({ error: 'Custom avatar not found' }, { status: 404 })
      }

      // Download photo and convert to base64
      const photoRes = await fetch(customAvatar.photo_url)
      if (!photoRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch avatar photo' }, { status: 500 })
      }
      const photoBuffer = await photoRes.arrayBuffer()
      const photoBase64 = Buffer.from(photoBuffer).toString('base64')
      const contentType = photoRes.headers.get('content-type') || 'image/jpeg'

      // Consume credits (8 seconds default = 16 credits for standard)
      const creditCost = 16
      const creditResult = await consumeCredits({
        userId: user.id,
        amount: creditCost,
        resourceType: 'veo_video',
        resourceId: 'pending',
      })

      if (!creditResult.success) {
        return NextResponse.json(
          { error: 'Not enough AI Video credits. Purchase more credits to continue.' },
          { status: 403 }
        )
      }

      // Build Veo prompt from script
      const veoPrompt = `A person speaking directly to camera in a professional setting, natural gestures and expressions. They are presenting the following: ${finalScript.slice(0, 500)}`

      const aspectRatio = ASPECT_RATIO_MAP[dimension || '1280x720'] || '16:9'

      try {
        const { operationName } = await generateVeoVideo({
          prompt: veoPrompt,
          startFrame: { base64: photoBase64, mimeType: contentType },
          duration: 8,
          aspectRatio: aspectRatio as '16:9' | '9:16',
          model: 'veo-3.1-generate-preview',
        })

        // Insert into DB
        const { data: videoRecord, error: dbError } = await admin
          .from('videos')
          .insert({
            user_id: user.id,
            title: title.trim(),
            mode: 'avatar',
            status: 'processing',
            avatar_id,
            voice_id,
            script,
            dimension: dimension || '1280x720',
            provider: 'google_veo',
            veo_operation_name: operationName,
            veo_model: 'veo-3.1-generate-preview',
            credits_used: creditCost,
          })
          .select()
          .single()

        if (dbError) {
          console.error('DB error inserting video:', dbError)
          return NextResponse.json({ error: 'Failed to save video record' }, { status: 500 })
        }

        return NextResponse.json({ video: videoRecord })
      } catch (veoError) {
        // Refund credits on Veo failure
        console.error('Veo generation error:', veoError)
        const { refundCredits } = await import('@/lib/credits')
        await refundCredits({
          userId: user.id,
          amount: creditCost,
          resourceId: 'failed_custom_avatar',
          reason: 'Veo generation failed for custom avatar',
        })
        throw veoError
      }
    }

    // Standard HeyGen flow
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
    const { data: videoRecord, error: dbError } = await admin
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
