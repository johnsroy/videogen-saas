import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createPhotoAvatar } from '@/lib/heygen'
import { getEffectivePlan, isPaidPlan } from '@/lib/plan-utils'

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BASE64_LENGTH = 15_000_000 // ~10MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check plan — custom avatars require Starter+
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single()

    const planId = getEffectivePlan(subscription?.plan, subscription?.status)
    if (!isPaidPlan(planId)) {
      return NextResponse.json(
        { error: 'Custom avatars require a paid plan. Upgrade to Starter or higher.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, photo } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Avatar name is required' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Avatar name must be under 100 characters' }, { status: 400 })
    }

    if (!photo?.base64 || typeof photo.base64 !== 'string') {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 })
    }
    if (photo.base64.length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Photo must be under 10MB' }, { status: 400 })
    }
    if (!VALID_IMAGE_TYPES.includes(photo.mimeType)) {
      return NextResponse.json({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' }, { status: 400 })
    }

    const avatar = await createPhotoAvatar({
      name: name.trim(),
      photoBase64: photo.base64,
      mimeType: photo.mimeType,
    })

    return NextResponse.json({ avatar })
  } catch (error) {
    console.error('Create avatar error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create avatar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
