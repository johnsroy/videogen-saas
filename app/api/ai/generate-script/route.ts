import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { SCRIPT_WRITER_SYSTEM } from '@/lib/ai-prompts'

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
    const { topic, duration_seconds } = body

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    if (topic.length > 500) {
      return NextResponse.json({ error: 'Topic exceeds 500 character limit' }, { status: 400 })
    }

    const targetDuration = duration_seconds ?? 60

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

    const wordCount = Math.round((targetDuration / 60) * 150)
    const result = await chatCompletion({
      system: SCRIPT_WRITER_SYSTEM,
      user: `Write a video script about: ${topic.trim()}. Target duration: ${targetDuration} seconds (approximately ${wordCount} words).`,
      maxTokens: 2000,
      temperature: 0.7,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'generate',
        input_text: topic.trim(),
        output_text: result.content,
      })

    return NextResponse.json({ script: result.content })
  } catch (error) {
    console.error('Generate script error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate script'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
