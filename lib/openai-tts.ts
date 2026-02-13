const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech'

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  return key
}

export const TTS_VOICES = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral', description: 'Warm and balanced' },
  { id: 'ash', name: 'Ash', gender: 'male', description: 'Clear and confident' },
  { id: 'ballad', name: 'Ballad', gender: 'male', description: 'Smooth and expressive' },
  { id: 'coral', name: 'Coral', gender: 'female', description: 'Friendly and natural' },
  { id: 'echo', name: 'Echo', gender: 'male', description: 'Soft-spoken and calm' },
  { id: 'fable', name: 'Fable', gender: 'neutral', description: 'Storytelling and warm' },
  { id: 'juniper', name: 'Juniper', gender: 'female', description: 'Bright and engaging' },
  { id: 'nova', name: 'Nova', gender: 'female', description: 'Energetic and clear' },
  { id: 'onyx', name: 'Onyx', gender: 'male', description: 'Deep and authoritative' },
  { id: 'sage', name: 'Sage', gender: 'neutral', description: 'Thoughtful and composed' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Warm and soothing' },
] as const

export type TTSVoiceId = (typeof TTS_VOICES)[number]['id']

const VALID_VOICE_IDS = new Set<string>(TTS_VOICES.map((v) => v.id))

export function isValidVoice(voice: string): voice is TTSVoiceId {
  return VALID_VOICE_IDS.has(voice)
}

export interface TTSParams {
  input: string
  voice: TTSVoiceId
  instructions?: string
  speed?: number
}

export async function generateSpeech(params: TTSParams): Promise<ArrayBuffer> {
  const res = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: params.input,
      voice: params.voice,
      instructions: params.instructions || undefined,
      speed: params.speed ?? 1.0,
      response_format: 'mp3',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI TTS error ${res.status}: ${err}`)
  }

  return res.arrayBuffer()
}
