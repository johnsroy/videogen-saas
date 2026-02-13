import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVeoVideo, calculateVeoCreditCost } from '@/lib/google-veo'
import { getEffectivePlan, canUseVeo } from '@/lib/plan-utils'
import { consumeCredits } from '@/lib/credits'
import type { VeoModel, VeoAspectRatio, VeoDuration, VeoReferenceImage } from '@/lib/veo-types'

const VALID_DURATIONS: VeoDuration[] = [4, 6, 8]
const VALID_ASPECT_RATIOS: VeoAspectRatio[] = ['16:9', '9:16']
const VALID_MODELS: VeoModel[] = ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview']
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_REFERENCE_IMAGES = 3
const MAX_IMAGE_BASE64_LENGTH = 15_000_000 // ~10MB in base64

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      prompt,
      referenceImages,
      startFrame,
      endFrame,
      aspectRatio = '16:9',
      duration = 8,
      generateAudio = false,
      negativePrompt,
      model = 'veo-3.1-generate-preview',
      style,
      emotion,
      mode = 'ugc',
    } = body

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt exceeds 5000 character limit' }, { status: 400 })
    }

    // Validate parameters against allowed values
    if (!VALID_DURATIONS.includes(duration as VeoDuration)) {
      return NextResponse.json({ error: 'Invalid duration. Must be 4, 6, or 8 seconds.' }, { status: 400 })
    }
    if (!VALID_ASPECT_RATIOS.includes(aspectRatio as VeoAspectRatio)) {
      return NextResponse.json({ error: 'Invalid aspect ratio. Must be 16:9 or 9:16.' }, { status: 400 })
    }
    if (!VALID_MODELS.includes(model as VeoModel)) {
      return NextResponse.json({ error: 'Invalid model.' }, { status: 400 })
    }
    if (negativePrompt && typeof negativePrompt === 'string' && negativePrompt.length > 2000) {
      return NextResponse.json({ error: 'Negative prompt exceeds 2000 character limit' }, { status: 400 })
    }

    // Validate reference images
    if (referenceImages) {
      if (!Array.isArray(referenceImages) || referenceImages.length > MAX_REFERENCE_IMAGES) {
        return NextResponse.json({ error: `Maximum ${MAX_REFERENCE_IMAGES} reference images allowed.` }, { status: 400 })
      }
      for (const img of referenceImages) {
        if (!img.base64 || typeof img.base64 !== 'string' || img.base64.length > MAX_IMAGE_BASE64_LENGTH) {
          return NextResponse.json({ error: 'Invalid reference image. Each image must be under 10MB.' }, { status: 400 })
        }
        if (!VALID_IMAGE_TYPES.includes(img.mimeType)) {
          return NextResponse.json({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' }, { status: 400 })
        }
      }
    }

    // Validate start/end frames
    for (const frame of [startFrame, endFrame].filter(Boolean)) {
      if (!frame.base64 || typeof frame.base64 !== 'string' || frame.base64.length > MAX_IMAGE_BASE64_LENGTH) {
        return NextResponse.json({ error: 'Invalid frame image. Must be under 10MB.' }, { status: 400 })
      }
      if (!VALID_IMAGE_TYPES.includes(frame.mimeType)) {
        return NextResponse.json({ error: 'Invalid frame image type. Use JPEG, PNG, or WebP.' }, { status: 400 })
      }
    }

    // Check plan — Veo requires Creator+
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const planId = getEffectivePlan(subscription?.plan, subscription?.status)

    if (!canUseVeo(planId)) {
      return NextResponse.json(
        { error: 'AI Video Studio requires a Creator or Enterprise plan.', code: 'PLAN_REQUIRED' },
        { status: 403 }
      )
    }

    // Check credit balance (without consuming yet)
    const creditsCost = calculateVeoCreditCost(duration as VeoDuration, model as VeoModel)
    const { data: balance } = await getSupabaseAdmin()
      .from('credit_balances')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .single()

    if (!balance || balance.credits_remaining < creditsCost) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Need ${creditsCost}, have ${balance?.credits_remaining ?? 0}. Upgrade your plan for more credits.`,
          code: 'INSUFFICIENT_CREDITS',
        },
        { status: 403 }
      )
    }

    // Build reference images
    const veoReferenceImages: VeoReferenceImage[] | undefined = referenceImages?.map(
      (img: { base64: string; mimeType: string; label?: string }) => ({
        base64: img.base64,
        mimeType: img.mimeType,
        label: img.label,
      })
    )

    const veoStartFrame: VeoReferenceImage | undefined = startFrame
      ? { base64: startFrame.base64, mimeType: startFrame.mimeType }
      : undefined

    const veoEndFrame: VeoReferenceImage | undefined = endFrame
      ? { base64: endFrame.base64, mimeType: endFrame.mimeType }
      : undefined

    // Call Veo API first (before consuming credits)
    const result = await generateVeoVideo({
      prompt: prompt.trim(),
      referenceImages: veoReferenceImages,
      startFrame: veoStartFrame,
      endFrame: veoEndFrame,
      aspectRatio: aspectRatio as VeoAspectRatio,
      duration: duration as VeoDuration,
      generateAudio,
      negativePrompt: negativePrompt?.trim() || undefined,
      model: model as VeoModel,
    })

    // Determine dimension string from aspect ratio
    const dimension = aspectRatio === '9:16' ? '720x1280' : '1280x720'

    // Insert video record
    const { data: videoRecord, error: dbError } = await getSupabaseAdmin()
      .from('videos')
      .insert({
        user_id: user.id,
        heygen_video_id: null,
        title: title.trim(),
        mode,
        status: 'pending',
        provider: 'google_veo',
        script: null,
        prompt: prompt.trim(),
        dimension,
        style: style ?? null,
        emotion: emotion ?? null,
        credits_used: creditsCost,
        veo_operation_name: result.operationName,
        veo_model: model,
        audio_enabled: generateAudio,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error inserting Veo video:', dbError)
      return NextResponse.json({ error: 'Failed to save video record' }, { status: 500 })
    }

    // Consume credits AFTER successful API call + DB insert, using actual video ID
    await consumeCredits({
      userId: user.id,
      amount: creditsCost,
      resourceType: 'veo_video',
      resourceId: videoRecord.id,
      description: `Veo video: ${title.trim()}`,
    })

    return NextResponse.json({ video: videoRecord })
  } catch (error) {
    console.error('Veo video generate error:', error)
    const raw = error instanceof Error ? error.message : String(error)

    // Detect Google API quota / rate-limit errors and return a friendly message
    if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429') || raw.includes('quota')) {
      return NextResponse.json(
        { error: 'Google Veo API quota exceeded. Please wait a few minutes and try again, or check your Google AI billing at ai.google.dev.' },
        { status: 429 }
      )
    }

    return NextResponse.json({ error: raw || 'Failed to generate video' }, { status: 500 })
  }
}
