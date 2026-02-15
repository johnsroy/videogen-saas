// Google Veo 3.1 Video Generation types

export type VeoModel = 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'
export type VeoAspectRatio = '16:9' | '9:16'
export type VeoDuration = 4 | 6 | 8
/** Extended durations for multi-segment generation (user-facing).
 * Durations > 8s are automatically split into multiple 8s clips. */
export type ExtendedDuration = 4 | 6 | 8 | 15 | 30 | 60 | 120 | 300 | 600 | 1800 | 2700 | 3600
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
  /** Whether to generate audio with the extended video */
  generateAudio?: boolean
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

// ── Shot Designer Template Marketplace types ──

export type TemplateCategory =
  | 'product-showcase'
  | 'lifestyle'
  | 'fashion-beauty'
  | 'food-beverage'
  | 'tech-gadgets'
  | 'travel-adventure'
  | 'business-corporate'
  | 'social-media'
  | 'ugc-authentic'
  | 'seasonal'

/** How the user's product image is used in Veo generation */
export type TemplateImageMode = 'reference' | 'start_frame'

export type TemplateDurationTier = 'short' | 'medium' | 'long' | 'xlarge'

export interface TemplateSegment {
  promptTemplate: string
  duration: VeoDuration
  cameraMovement?: string
  imageMode: TemplateImageMode
  /** Label for progress tracking (e.g., "Intro", "Feature 1", "CTA") */
  label: string
}

export interface ShotTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  tags: string[]
  /** Prompt template with {product} and {product_description} placeholders */
  promptTemplate: string
  cameraMovement: string
  imageMode: TemplateImageMode
  suggestedDuration: VeoDuration
  suggestedAspectRatio: VeoAspectRatio
  durationTier: TemplateDurationTier
  /** Total duration in seconds (for multi-segment, sum of all segments) */
  totalDurationSeconds: number
  /** Segments for multi-segment (long/xlarge) templates */
  segments?: TemplateSegment[]
  gradientColors: [string, string]
  /** Optional preview video URL for hover playback */
  previewVideoUrl?: string
  isNew?: boolean
  isPopular?: boolean
}

export interface ProductInput {
  name: string
  description?: string
  images: Array<{
    base64: string
    mimeType: string
    name: string
    previewUrl: string
  }>
}
