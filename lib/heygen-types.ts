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
  mode: 'avatar' | 'prompt' | 'ugc' | 'ingredients' | 'shot_design' | 'extension'
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
  provider: string
  nb_task_id: string | null
  style: string | null
  credits_used: number
  emotion: string | null
  batch_id: string | null
  // Veo 3.1 fields
  veo_operation_name: string | null
  veo_model: string | null
  audio_enabled: boolean
  extend_count: number
  parent_video_id: string | null
  created_at: string
  updated_at: string
}
