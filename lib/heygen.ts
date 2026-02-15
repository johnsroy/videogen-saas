import type { HeyGenAvatar, HeyGenVoice } from './heygen-types'

const HEYGEN_BASE_URL = 'https://api.heygen.com'

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY
  if (!key) throw new Error('HEYGEN_API_KEY is not set')
  return key
}

async function heygenFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${HEYGEN_BASE_URL}${path}`, {
    ...options,
    headers: {
      'X-Api-Key': getApiKey(),
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HeyGen API error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function listAvatars(): Promise<HeyGenAvatar[]> {
  const data = await heygenFetch<{ data: { avatars: HeyGenAvatar[] } }>('/v2/avatars')
  return data.data.avatars
}

export async function listVoices(): Promise<HeyGenVoice[]> {
  const data = await heygenFetch<{ data: { voices: HeyGenVoice[] } }>('/v2/voices')
  return data.data.voices
}

export async function generateVideo(params: {
  avatar_id: string
  voice_id: string
  script: string
  dimension?: { width: number; height: number }
}): Promise<{ video_id: string }> {
  const body = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: params.avatar_id,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: params.script,
          voice_id: params.voice_id,
        },
      },
    ],
    dimension: params.dimension,
  }
  const data = await heygenFetch<{ data: { video_id: string } }>('/v2/video/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { video_id: data.data.video_id }
}

export async function createPhotoAvatar(params: {
  name: string
  photoBase64: string
  mimeType: string
}): Promise<HeyGenAvatar> {
  const data = await heygenFetch<{ data: { avatar_id: string } }>('/v2/photo_avatar', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      image: {
        type: 'base64',
        data: params.photoBase64,
        mime_type: params.mimeType,
      },
    }),
  })
  return {
    avatar_id: data.data.avatar_id,
    avatar_name: params.name,
    preview_image_url: '',
  }
}

export async function getVideoStatus(videoId: string): Promise<{
  status: string
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error?: string
}> {
  const data = await heygenFetch<{
    data: {
      status: string
      video_url?: string
      thumbnail_url?: string
      duration?: number
      error?: { message?: string } | string
    }
  }>(`/v1/video_status.get?video_id=${videoId}`)
  return {
    status: data.data.status,
    video_url: data.data.video_url,
    thumbnail_url: data.data.thumbnail_url,
    duration: data.data.duration,
    error: typeof data.data.error === 'string' ? data.data.error : data.data.error?.message,
  }
}
