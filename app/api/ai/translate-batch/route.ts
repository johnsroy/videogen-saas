import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { SCRIPT_TRANSLATOR_SYSTEM, buildTranslatePrompt } from '@/lib/ai-prompts'
import { consumeCredits } from '@/lib/credits'

const FREE_LANGUAGES = 1
const CONCURRENCY = 5

/** Process items in parallel batches of `limit` */
async function parallelBatch<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<{ results: R[]; errors: { item: T; error: string }[] }> {
  const results: R[] = []
  const errors: { item: T; error: string }[] = []

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    const settled = await Promise.allSettled(batch.map(fn))
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j]
      if (s.status === 'fulfilled') {
        results.push(s.value)
      } else {
        errors.push({ item: batch[j], error: 'Translation failed' })
      }
    }
  }

  return { results, errors }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { script, source_language, target_languages } = body

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }
    if (script.length > 5000) {
      return NextResponse.json({ error: 'Script exceeds 5000 character limit' }, { status: 400 })
    }
    if (!Array.isArray(target_languages) || target_languages.length === 0) {
      return NextResponse.json({ error: 'At least one target language is required' }, { status: 400 })
    }
    if (target_languages.length > 200) {
      return NextResponse.json({ error: 'Too many target languages' }, { status: 400 })
    }

    // Calculate credit cost: first 5 are free, each additional costs 1 credit
    const creditCost = Math.max(0, target_languages.length - FREE_LANGUAGES)

    if (creditCost > 0) {
      const { data: balance } = await getSupabaseAdmin()
        .from('credit_balances')
        .select('credits_remaining')
        .eq('user_id', user.id)
        .single()

      if (!balance || balance.credits_remaining < creditCost) {
        return NextResponse.json(
          {
            error: `Need ${creditCost} credits for ${target_languages.length} languages (first ${FREE_LANGUAGES} are free). You have ${balance?.credits_remaining ?? 0} credits.`,
            code: 'INSUFFICIENT_CREDITS',
          },
          { status: 403 }
        )
      }
    }

    // Translate in parallel batches of CONCURRENCY
    const translations: Record<string, string> = {}
    const translationErrors: Record<string, string> = {}

    const srcLang = typeof source_language === 'string' ? source_language : 'English'

    const { results, errors } = await parallelBatch(
      target_languages as string[],
      CONCURRENCY,
      async (lang: string) => {
        const userPrompt = buildTranslatePrompt({
          script: script.trim(),
          sourceLanguage: srcLang,
          targetLanguage: lang,
        })

        const result = await chatCompletion({
          system: SCRIPT_TRANSLATOR_SYSTEM,
          user: userPrompt,
          maxTokens: 4000,
          temperature: 0.3,
        })

        return { lang, content: result.content }
      }
    )

    for (const r of results) {
      translations[r.lang] = r.content
    }
    for (const e of errors) {
      translationErrors[e.item] = e.error
    }

    const successCount = Object.keys(translations).length

    // Consume credits for languages beyond free tier
    if (creditCost > 0 && successCount > FREE_LANGUAGES) {
      const actualCredits = Math.min(creditCost, successCount - FREE_LANGUAGES)
      if (actualCredits > 0) {
        await consumeCredits({
          userId: user.id,
          amount: actualCredits,
          resourceType: 'batch_translation',
          resourceId: `translate-${Date.now()}`,
          description: `Batch translation to ${successCount} languages (${actualCredits} credits)`,
        })
      }
    }

    // Record AI usage
    await getSupabaseAdmin()
      .from('script_enhancements')
      .insert({
        user_id: user.id,
        action: 'translate_batch',
        input_text: `${source_language || 'auto'}→${successCount} languages`,
        output_text: `Translated to: ${Object.keys(translations).join(', ')}`,
      })

    return NextResponse.json({
      translations,
      errors: Object.keys(translationErrors).length > 0 ? translationErrors : undefined,
      credits_used: creditCost > 0 ? Math.min(creditCost, Math.max(0, successCount - FREE_LANGUAGES)) : 0,
    })
  } catch (error) {
    console.error('Batch translate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to translate'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
