import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateImage } from '@/lib/nanobanana-pro'
import { getEffectivePlan } from '@/lib/plan-utils'
import { consumeCredits, refundCredits, calculateImageCreditCost } from '@/lib/credits'
import type { NBResolution, NBAspectRatio, NBGenerationType } from '@/lib/nanobanana-types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      prompt,
      generation_type = 'TEXTTOIMAGE',
      aspect_ratio = '1:1',
      resolution = '1K',
      num_images = 1,
      image_urls,
    } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt exceeds 2000 character limit' }, { status: 400 })
    }

    // Check plan
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const planId = getEffectivePlan(subscription?.plan, subscription?.status)

    // Consume credits FIRST (atomic — prevents double-spend)
    const cost = calculateImageCreditCost(resolution) * Math.min(num_images ?? 1, 4)
    const imageTaskId = crypto.randomUUID()
    const creditResult = await consumeCredits({
      userId: user.id,
      amount: cost,
      resourceType: 'nb_image',
      resourceId: imageTaskId,
      description: `Image generation (${resolution})`,
    })

    if (!creditResult.success) {
      return NextResponse.json(
        { error: `Insufficient credits. Need ${cost}, have ${creditResult.remaining}. Upgrade your plan for more credits.`, code: 'INSUFFICIENT_CREDITS' },
        { status: 403 }
      )
    }

    try {
      // Call NanoBanana Pro API
      const result = await generateImage({
        prompt: prompt.trim(),
        generationType: generation_type as NBGenerationType,
        aspectRatio: aspect_ratio as NBAspectRatio,
        resolution: resolution as NBResolution,
        numImages: Math.min(num_images, 4),
        imageUrls: image_urls,
      })

      // Record task in DB
      const { data: task, error: dbError } = await getSupabaseAdmin()
        .from('nb_image_tasks')
        .insert({
          id: imageTaskId,
          user_id: user.id,
          task_id: result.taskId,
          prompt: prompt.trim(),
          generation_type,
          status: 'pending',
          resolution,
          credits_used: cost,
        })
        .select()
        .single()

      if (dbError) {
        throw new Error(`Failed to save task: ${dbError.message}`)
      }

      return NextResponse.json({ task })
    } catch (genError) {
      // Generation failed — refund credits
      await refundCredits({
        userId: user.id,
        amount: cost,
        resourceId: imageTaskId,
        reason: 'Image generation failed — credits refunded',
      }).catch(() => {})

      console.error('Image generation error:', genError)
      const message = genError instanceof Error ? genError.message : 'Image generation failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('NanoBanana image generate error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
