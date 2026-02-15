import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getEffectivePlan, isPaidPlan } from '@/lib/plan-utils'

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

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

    const formData = await request.formData()
    const name = formData.get('name')
    const photoFile = formData.get('photo')

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Avatar name is required' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Avatar name must be under 100 characters' }, { status: 400 })
    }

    if (!photoFile || !(photoFile instanceof File)) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 })
    }
    if (photoFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Photo must be under 10MB' }, { status: 400 })
    }
    if (!VALID_IMAGE_TYPES.includes(photoFile.type)) {
      return NextResponse.json({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' }, { status: 400 })
    }

    // Upload photo to Supabase Storage
    const admin = getSupabaseAdmin()
    const ext = photoFile.type.split('/')[1] === 'jpeg' ? 'jpg' : photoFile.type.split('/')[1]
    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`
    const arrayBuffer = await photoFile.arrayBuffer()

    const { error: uploadError } = await admin.storage
      .from('custom-avatars')
      .upload(filePath, arrayBuffer, {
        contentType: photoFile.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from('custom-avatars')
      .getPublicUrl(filePath)

    // Save avatar metadata to DB
    const { data: avatar, error: dbError } = await admin
      .from('custom_avatars')
      .insert({
        user_id: user.id,
        name: name.trim(),
        photo_url: urlData.publicUrl,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error creating custom avatar:', dbError)
      // Clean up uploaded file
      await admin.storage.from('custom-avatars').remove([filePath])
      return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 })
    }

    // Return in HeyGenAvatar-compatible format with custom_ prefix
    return NextResponse.json({
      avatar: {
        avatar_id: `custom_${avatar.id}`,
        avatar_name: avatar.name,
        preview_image_url: avatar.photo_url,
        gender: undefined,
      },
    })
  } catch (error) {
    console.error('Create avatar error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create avatar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
