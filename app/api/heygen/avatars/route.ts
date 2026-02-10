import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    if (avatarCache && Date.now() - avatarCache.timestamp < CACHE_TTL) {
      return NextResponse.json({ avatars: avatarCache.data })
    }

    const avatars = await listAvatars()
    avatarCache = { data: avatars, timestamp: Date.now() }

    return NextResponse.json({ avatars })
  } catch (error) {
    console.error('Avatars error:', error)
    return NextResponse.json({ error: 'Failed to fetch avatars' }, { status: 500 })
  }
}
