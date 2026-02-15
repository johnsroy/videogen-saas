import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { MUSIC_PROMPT_ENHANCER_SYSTEM, buildMusicEnhancePrompt } from '@/lib/ai-prompts'
import { getEffectivePlan, canUseAI, getAILimit } from '@/lib/plan-utils'

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
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (prompt.length > 500) {
      return NextResponse.json({ error: 'Prompt exceeds 500 character limit' }, { status: 400 })
    }

    // Check rate limits (shared AI uses budget — no credit cost)
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const planId = getEffectivePlan(subscription?.plan, subscription?.status)
    const aiLimit = getAILimit(planId)

    if (aiLimit !== null) {
      const { count } = await getSupabaseAdmin()
        .from('script_enhancements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', getFirstDayOfMonth())

      if (!canUseAI(planId, count ?? 0)) {
        return NextResponse.json(
          { error: 'Monthly AI limit reached. Upgrade for unlimited AI features.', code: 'LIMIT_REACHED' },
          { status: 403 }
        )
      }
    }

    const result = await chatCompletion({
      system: MUSIC_PROMPT_ENHANCER_SYSTEM,
      user: buildMusicEnhancePrompt(prompt.trim()),
      maxTokens: 1000,
      temperature: 0.7,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'enhance',
        enhancement_type: 'music_prompt',
        input_text: prompt.trim(),
        output_text: result.content,
      })

    return NextResponse.json({ enhanced_prompt: result.content })
  } catch (error) {
    console.error('Enhance music prompt error:', error)
    const message = error instanceof Error ? error.message : 'Failed to enhance prompt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
