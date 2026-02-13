import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { SCRIPT_WRITER_SYSTEM, buildGeneratePrompt } from '@/lib/ai-prompts'
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
    const { topic, duration_seconds, tone, audience, custom_instructions } = body

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    if (topic.length > 500) {
      return NextResponse.json({ error: 'Topic exceeds 500 character limit' }, { status: 400 })
    }

    if (audience && typeof audience === 'string' && audience.length > 200) {
      return NextResponse.json({ error: 'Audience exceeds 200 character limit' }, { status: 400 })
    }

    if (custom_instructions && typeof custom_instructions === 'string' && custom_instructions.length > 500) {
      return NextResponse.json({ error: 'Custom instructions exceed 500 character limit' }, { status: 400 })
    }

    const targetDuration = duration_seconds ?? 60

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
          { error: `Monthly AI limit of ${aiLimit} uses reached. Upgrade your plan for unlimited AI features.`, code: 'LIMIT_REACHED' },
          { status: 403 }
        )
      }
    }

    const userPrompt = buildGeneratePrompt({
      topic: topic.trim(),
      durationSeconds: targetDuration,
      tone: typeof tone === 'string' ? tone : undefined,
      audience: typeof audience === 'string' ? audience : undefined,
      customInstructions: typeof custom_instructions === 'string' ? custom_instructions : undefined,
    })

    const result = await chatCompletion({
      system: SCRIPT_WRITER_SYSTEM,
      user: userPrompt,
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
