import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { CAPTION_TRANSLATOR_SYSTEM, buildCaptionTranslatePrompt } from '@/lib/ai-prompts'

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
    const { video_id, target_language } = body

    if (!video_id || typeof video_id !== 'string') {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    if (!target_language || typeof target_language !== 'string') {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 })
    }

    // Fetch existing captions
    const { data: caption } = await supabase
      .from('captions')
      .select('content')
      .eq('video_id', video_id)
      .eq('user_id', user.id)
      .single()

    if (!caption?.content) {
      return NextResponse.json({ error: 'No captions found for this video. Generate captions first.' }, { status: 404 })
    }

    // Check rate limits
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const isProActive = subscription?.plan === 'pro' && subscription?.status === 'active'

    if (!isProActive) {
      const { count } = await getSupabaseAdmin()
        .from('script_enhancements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', getFirstDayOfMonth())

      if ((count ?? 0) >= 10) {
        return NextResponse.json(
          { error: 'Monthly AI limit reached. Upgrade to Pro for unlimited AI features.', code: 'LIMIT_REACHED' },
          { status: 403 }
        )
      }
    }

    const userPrompt = buildCaptionTranslatePrompt({
      captions: caption.content,
      targetLanguage: target_language,
    })

    const result = await chatCompletion({
      system: CAPTION_TRANSLATOR_SYSTEM,
      user: userPrompt,
      maxTokens: 4000,
      temperature: 0.3,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'translate_captions',
        input_text: `video:${video_id}→${target_language}`,
        output_text: result.content,
      })

    return NextResponse.json({ translated_captions: result.content })
  } catch (error) {
    console.error('Translate captions error:', error)
    const message = error instanceof Error ? error.message : 'Failed to translate captions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
