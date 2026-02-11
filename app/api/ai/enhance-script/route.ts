import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { ENHANCEMENT_PROMPTS } from '@/lib/ai-prompts'

const VALID_ACTIONS = Object.keys(ENHANCEMENT_PROMPTS)

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
    const { script, action } = body

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }

    if (script.length > 5000) {
      return NextResponse.json({ error: 'Script exceeds 5000 character limit' }, { status: 400 })
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 })
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

    const result = await chatCompletion({
      system: ENHANCEMENT_PROMPTS[action],
      user: script.trim(),
      maxTokens: 3000,
      temperature: 0.5,
    })

    // Record usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'enhance',
        enhancement_type: action,
        input_text: script.trim(),
        output_text: result.content,
      })

    return NextResponse.json({ enhanced_script: result.content })
  } catch (error) {
    console.error('Enhance script error:', error)
    const message = error instanceof Error ? error.message : 'Failed to enhance script'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
