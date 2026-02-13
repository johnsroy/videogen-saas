import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { UGC_SCRIPT_WRITER_SYSTEM, buildUGCScriptPrompt } from '@/lib/ai-prompts'
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
    const { template, product_name, duration_seconds, emotion, audience } = body

    if (!template || typeof template !== 'string') {
      return NextResponse.json({ error: 'Template is required' }, { status: 400 })
    }

    const targetDuration = duration_seconds ?? 30

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

    const userPrompt = buildUGCScriptPrompt({
      template,
      productName: typeof product_name === 'string' ? product_name : undefined,
      durationSeconds: targetDuration,
      emotion: typeof emotion === 'string' ? emotion : undefined,
      audience: typeof audience === 'string' ? audience : undefined,
    })

    const result = await chatCompletion({
      system: UGC_SCRIPT_WRITER_SYSTEM,
      user: userPrompt,
      maxTokens: 2000,
      temperature: 0.8,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'generate_ugc',
        input_text: `${template}: ${product_name ?? ''}`,
        output_text: result.content,
      })

    return NextResponse.json({ script: result.content })
  } catch (error) {
    console.error('Generate UGC script error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate script'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
