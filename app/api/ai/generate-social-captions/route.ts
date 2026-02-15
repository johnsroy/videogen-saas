import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/anthropic'
import { SOCIAL_CAPTION_SYSTEM, buildSocialCaptionPrompt } from '@/lib/ai-prompts'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, script, prompt } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Video title is required' }, { status: 400 })
    }

    const result = await chatCompletion({
      system: SOCIAL_CAPTION_SYSTEM,
      user: buildSocialCaptionPrompt({
        title: title.trim(),
        script: typeof script === 'string' ? script : undefined,
        prompt: typeof prompt === 'string' ? prompt : undefined,
      }),
      maxTokens: 1000,
      temperature: 0.7,
    })

    // Parse the JSON response
    let captions: Record<string, string>
    try {
      captions = JSON.parse(result.content)
    } catch {
      // If parsing fails, try to extract JSON from the response
      const match = result.content.match(/\{[\s\S]*\}/)
      if (match) {
        captions = JSON.parse(match[0])
      } else {
        return NextResponse.json({ error: 'Failed to parse captions' }, { status: 500 })
      }
    }

    return NextResponse.json({ captions })
  } catch (error) {
    console.error('Generate social captions error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate captions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
