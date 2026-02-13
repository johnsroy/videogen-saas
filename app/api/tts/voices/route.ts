import { NextResponse } from 'next/server'
import { TTS_VOICES } from '@/lib/openai-tts'

export async function GET() {
  return NextResponse.json({ voices: TTS_VOICES })
}
