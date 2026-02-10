import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listVoices } from '@/lib/heygen'
import type { HeyGenVoice } from '@/lib/heygen-types'

let voiceCache: { data: HeyGenVoice[]; timestamp: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (voiceCache && Date.now() - voiceCache.timestamp < CACHE_TTL) {
      return NextResponse.json({ voices: voiceCache.data })
    }

    const voices = await listVoices()
    voiceCache = { data: voices, timestamp: Date.now() }

    return NextResponse.json({ voices })
  } catch (error) {
    console.error('Voices error:', error)
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 })
  }
}
