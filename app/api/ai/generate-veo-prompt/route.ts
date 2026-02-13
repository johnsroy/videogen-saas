import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { VEO_PROMPT_GENERATOR_SYSTEM, buildVeoGeneratePrompt } from '@/lib/ai-prompts'
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
    const { topic, style, mood, duration } = body

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    if (topic.length > 1000) {
      return NextResponse.json({ error: 'Topic exceeds 1000 character limit' }, { status: 400 })
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

    const userPrompt = buildVeoGeneratePrompt({
      topic: topic.trim(),
      style: typeof style === 'string' ? style : undefined,
      mood: typeof mood === 'string' ? mood : undefined,
      duration: typeof duration === 'number' ? duration : undefined,
    })

    const result = await chatCompletion({
      system: VEO_PROMPT_GENERATOR_SYSTEM,
      user: userPrompt,
      maxTokens: 3000,
      temperature: 0.8,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'generate',
        enhancement_type: 'veo_prompt_generate',
        input_text: topic.trim(),
        output_text: result.content,
      })

    return NextResponse.json({ prompt: result.content })
  } catch (error) {
    console.error('Generate Veo prompt error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate prompt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
