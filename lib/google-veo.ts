import { GoogleGenAI, VideoGenerationReferenceType, GenerateVideosOperation } from '@google/genai'
import type {
  VeoGenerateParams,
  VeoExtendParams,
  VeoOperationResult,
  VeoOperationStatus,
  VeoModel,
} from './veo-types'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set')
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

const DEFAULT_MODEL: VeoModel = 'veo-3.1-generate-preview'
const FAST_MODEL: VeoModel = 'veo-3.1-fast-generate-preview'

/**
 * Generate a video using Google Veo 3.1.
 * Supports text-to-video, image-to-video (reference images), and start/end frame interpolation.
 */
export async function generateVeoVideo(
  params: VeoGenerateParams
): Promise<VeoOperationResult> {
  const ai = getClient()
  const model = params.model ?? DEFAULT_MODEL

  // Build reference images config (for "ingredients" mode)
  const referenceImages = params.referenceImages?.map((img) => ({
    image: { imageBytes: img.base64, mimeType: img.mimeType },
    referenceType: VideoGenerationReferenceType.ASSET,
  }))

  // For shot designer: start frame goes as source image, end frame as config.lastFrame
  const sourceImage = params.startFrame
    ? { imageBytes: params.startFrame.base64, mimeType: params.startFrame.mimeType }
    : undefined

  const lastFrame = params.endFrame
    ? { imageBytes: params.endFrame.base64, mimeType: params.endFrame.mimeType }
    : undefined

  // source.image is ONLY for image-to-video (start frame), NOT for reference images.
  // Reference images go exclusively in config.referenceImages.
  const primaryImage = sourceImage

  const operation = await ai.models.generateVideos({
    model,
    source: {
      prompt: params.prompt,
      ...(primaryImage && { image: primaryImage }),
    },
    config: {
      numberOfVideos: 1,
      durationSeconds: params.duration ?? 8,
      aspectRatio: params.aspectRatio ?? '16:9',
      ...(params.negativePrompt && { negativePrompt: params.negativePrompt }),
      ...(referenceImages?.length && { referenceImages }),
      ...(lastFrame && { lastFrame }),
      // personGeneration: 'allow_adult', — not supported on all Veo preview models
    },
  })

  if (!operation.name) {
    throw new Error('Veo API did not return an operation name')
  }

  return { operationName: operation.name }
}

/**
 * Poll the status of a Veo video generation operation.
 */
export async function getVeoOperationStatus(
  operationName: string
): Promise<VeoOperationStatus> {
  const ai = getClient()

  // Construct a proper GenerateVideosOperation instance for polling.
  // The SDK requires the _fromAPIResponse method, so we must use a real instance, not a plain object.
  const operation = new GenerateVideosOperation()
  operation.name = operationName

  const result = await ai.operations.getVideosOperation({
    operation,
  })

  if (result.error) {
    return {
      done: true,
      error: JSON.stringify(result.error),
    }
  }

  if (result.done && result.response?.generatedVideos?.[0]?.video?.uri) {
    return {
      done: true,
      videoUri: result.response.generatedVideos[0].video.uri,
    }
  }

  return {
    done: result.done ?? false,
    metadata: result.metadata as Record<string, unknown> | undefined,
  }
}

/**
 * Extend an existing video by generating more content.
 */
export async function extendVeoVideo(
  params: VeoExtendParams
): Promise<VeoOperationResult> {
  const ai = getClient()

  const videoSource = params.videoUri
    ? { uri: params.videoUri }
    : params.videoBase64
      ? { videoBytes: params.videoBase64, mimeType: 'video/mp4' }
      : undefined

  if (!videoSource) {
    throw new Error('Either videoUri or videoBase64 must be provided')
  }

  const operation = await ai.models.generateVideos({
    model: DEFAULT_MODEL,
    source: {
      prompt: params.prompt,
      video: videoSource,
    },
    config: {
      numberOfVideos: 1,
      ...(params.extendDurationSeconds && {
        durationSeconds: params.extendDurationSeconds,
      }),
      ...(params.generateAudio !== undefined && {
        generateAudio: params.generateAudio,
      }),
      // personGeneration: 'allow_adult', — not supported on all Veo preview models
    },
  })

  if (!operation.name) {
    throw new Error('Veo API did not return an operation name')
  }

  return { operationName: operation.name }
}

/**
 * Calculate the credit cost for a Veo video generation.
 * Standard model: 2 credits per second
 * Fast/draft model: 1 credit per second
 */
export function calculateVeoCreditCost(
  durationSec: number,
  model: VeoModel = DEFAULT_MODEL
): number {
  const ratePerSecond = model === FAST_MODEL ? 1 : 2
  return Math.max(1, Math.ceil(durationSec * ratePerSecond))
}
