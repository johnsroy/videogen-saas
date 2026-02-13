// NanoBanana Pro (Image Generation) types
export type NBGenerationType = 'TEXTTOIMAGE' | 'IMAGETOIMAGE'
export type NBResolution = '1K' | '2K' | '4K'
export type NBOutputFormat = 'png' | 'jpg' | 'webp'
export type NBAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16'

export interface NBImageGenerateParams {
  prompt: string
  generationType?: NBGenerationType
  aspectRatio?: NBAspectRatio
  resolution?: NBResolution
  outputFormat?: NBOutputFormat
  imageUrls?: string[]
  numImages?: number
}

export interface NBImageGenerateResponse {
  taskId: string
  status: string
}

export interface NBImageStatusResponse {
  taskId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  imageUrls?: string[]
  error?: string
}

// NanoBanana Video types (DEPRECATED — replaced by Google Veo 3.1)
// Keeping NBVideoStyle type for backward compatibility with existing UGC components
export type NBVideoStyle = 'realistic' | 'ugc' | '3d' | 'cinematic'

// NanoBanana image task DB record
export interface NBImageTask {
  id: string
  user_id: string
  task_id: string
  prompt: string
  generation_type: NBGenerationType
  status: 'pending' | 'processing' | 'completed' | 'failed'
  resolution: NBResolution
  image_urls: string[] | null
  credits_used: number
  created_at: string
  updated_at: string
}
