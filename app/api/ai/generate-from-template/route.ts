import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { TEMPLATE_GENERATOR_SYSTEM, buildTemplatePrompt } from '@/lib/ai-prompts'
import { getTemplateById } from '@/lib/script-templates'

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
    const { template_id, product_name, audience, tone } = body

    if (!template_id || typeof template_id !== 'string') {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const template = getTemplateById(template_id)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (product_name && typeof product_name === 'string' && product_name.length > 200) {
      return NextResponse.json({ error: 'Product name exceeds 200 character limit' }, { status: 400 })
    }

    if (audience && typeof audience === 'string' && audience.length > 200) {
      return NextResponse.json({ error: 'Audience exceeds 200 character limit' }, { status: 400 })
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

    const userPrompt = buildTemplatePrompt({
      templateTitle: template.title,
      structurePrompt: template.structurePrompt,
      estimatedDuration: template.estimatedDuration,
      productName: typeof product_name === 'string' ? product_name : undefined,
      audience: typeof audience === 'string' ? audience : undefined,
      tone: typeof tone === 'string' ? tone : undefined,
    })

    const result = await chatCompletion({
      system: TEMPLATE_GENERATOR_SYSTEM,
      user: userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'generate_from_template',
        input_text: `template:${template_id}`,
        output_text: result.content,
      })

    return NextResponse.json({ script: result.content })
  } catch (error) {
    console.error('Generate from template error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate script from template'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
