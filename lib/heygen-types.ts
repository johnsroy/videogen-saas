export interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  preview_image_url: string
  preview_video_url?: string
  gender?: string
}

export interface HeyGenVoice {
  voice_id: string
  name: string
  language: string
  gender?: string
  preview_audio?: string
  support_pause?: boolean
  emotion_support?: boolean
}

export interface VideoRecord {
  id: string
  user_id: string
  heygen_video_id: string | null
  title: string
  mode: 'avatar' | 'prompt'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  avatar_id: string | null
  voice_id: string | null
  script: string | null
  prompt: string | null
  dimension: string
  video_url: string | null
  thumbnail_url: string | null
  duration: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}
