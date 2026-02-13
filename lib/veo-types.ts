// Google Veo 3.1 Video Generation types

export type VeoModel = 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'
export type VeoAspectRatio = '16:9' | '9:16'
export type VeoDuration = 4 | 6 | 8
export type VeoResolution = '720p' | '1080p'

export interface VeoReferenceImage {
  /** Base64-encoded image data */
  base64: string
  /** MIME type (image/jpeg, image/png, image/webp) */
  mimeType: string
  /** Optional label describing this image's role */
  label?: string
}

export interface VeoGenerateParams {
  prompt: string
  /** Reference images for "ingredients" mode (up to 3) */
  referenceImages?: VeoReferenceImage[]
  /** Start frame for shot design mode */
  startFrame?: VeoReferenceImage
  /** End frame for shot design mode */
  endFrame?: VeoReferenceImage
  aspectRatio?: VeoAspectRatio
  duration?: VeoDuration
  /** Whether to generate audio with the video */
  generateAudio?: boolean
  /** Negative prompt — what to avoid */
  negativePrompt?: string
  /** Model selection: standard (high quality) or fast (draft preview) */
  model?: VeoModel
}

export interface VeoExtendParams {
  /** The video to extend (base64 or URI from previous generation) */
  videoBase64?: string
  videoUri?: string
  /** Prompt describing what should happen in the extension */
  prompt: string
  /** Target total duration after extension */
  extendDurationSeconds?: number
}

export interface VeoOperationResult {
  /** The long-running operation name for polling */
  operationName: string
}

export interface VeoOperationStatus {
  /** Whether the operation is complete */
  done: boolean
  /** Video URI when complete */
  videoUri?: string
  /** Error message if failed */
  error?: string
  /** Metadata about the operation */
  metadata?: Record<string, unknown>
}
