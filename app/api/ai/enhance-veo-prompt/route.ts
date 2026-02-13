import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { VEO_PROMPT_ENHANCER_SYSTEM, VEO_ENHANCEMENT_PROMPTS, buildVeoEnhancePrompt } from '@/lib/ai-prompts'
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
    const { prompt, style } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt exceeds 5000 character limit' }, { status: 400 })
    }

    // Check rate limits
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
          { error: `Monthly AI limit reached. Upgrade for unlimited AI features.`, code: 'LIMIT_REACHED' },
          { status: 403 }
        )
      }
    }

    // Use specific enhancement prompt if a known style key is provided
    const specificPrompt = typeof style === 'string' && VEO_ENHANCEMENT_PROMPTS[style]
    const systemPrompt = specificPrompt ? VEO_PROMPT_ENHANCER_SYSTEM : VEO_PROMPT_ENHANCER_SYSTEM
    const userPrompt = specificPrompt
      ? `${specificPrompt}\n\nOriginal prompt:\n"${prompt.trim()}"`
      : buildVeoEnhancePrompt(prompt.trim(), style)

    const result = await chatCompletion({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'enhance',
        enhancement_type: 'veo_prompt',
        input_text: prompt.trim(),
        output_text: result.content,
      })

    return NextResponse.json({ enhanced_prompt: result.content })
  } catch (error) {
    console.error('Enhance Veo prompt error:', error)
    const message = error instanceof Error ? error.message : 'Failed to enhance prompt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
