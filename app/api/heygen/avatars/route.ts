import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { listAvatars } from '@/lib/heygen'
import type { HeyGenAvatar } from '@/lib/heygen-types'

let avatarCache: { data: HeyGenAvatar[]; timestamp: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch HeyGen avatars (cached)
    let heygenAvatars: HeyGenAvatar[] = []
    if (avatarCache && Date.now() - avatarCache.timestamp < CACHE_TTL) {
      heygenAvatars = avatarCache.data
    } else {
      try {
        heygenAvatars = await listAvatars()
        avatarCache = { data: heygenAvatars, timestamp: Date.now() }
      } catch (e) {
        console.error('Failed to fetch HeyGen avatars:', e)
        // Continue with cached or empty — custom avatars still work
        heygenAvatars = avatarCache?.data ?? []
      }
    }

    // Fetch user's custom avatars from DB
    const { data: customAvatars } = await getSupabaseAdmin()
      .from('custom_avatars')
      .select('id, name, photo_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Convert custom avatars to HeyGenAvatar format
    const customFormatted: HeyGenAvatar[] = (customAvatars ?? []).map((ca) => ({
      avatar_id: `custom_${ca.id}`,
      avatar_name: `${ca.name} (Custom)`,
      preview_image_url: ca.photo_url,
    }))

    // Custom avatars appear first
    return NextResponse.json({ avatars: [...customFormatted, ...heygenAvatars] })
  } catch (error) {
    console.error('Avatars error:', error)
    return NextResponse.json({ error: 'Failed to fetch avatars' }, { status: 500 })
  }
}
