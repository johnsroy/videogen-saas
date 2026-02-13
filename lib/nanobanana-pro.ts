import type {
  NBImageGenerateParams,
  NBImageGenerateResponse,
  NBImageStatusResponse,
} from './nanobanana-types'

const NB_PRO_BASE_URL = 'https://nanobnana.com/api/v2'
const NB_STATUS_BASE_URL = 'https://api.nanobananaapi.ai/api/v1/nanobanana'

function getApiKey(): string {
  const key = process.env.NANOBANANA_PRO_API_KEY
  if (!key) throw new Error('NANOBANANA_PRO_API_KEY is not set')
  return key
}

async function nbProFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`NanoBanana Pro API error ${res.status}: ${body}`)
  }
  return res.json()
}

export async function generateImage(
  params: NBImageGenerateParams
): Promise<NBImageGenerateResponse> {
  const body = {
    prompt: params.prompt,
    generationType: params.generationType ?? 'TEXTTOIMAGE',
    aspectRatio: params.aspectRatio ?? '1:1',
    resolution: params.resolution ?? '1K',
    outputFormat: params.outputFormat ?? 'png',
    numImages: params.numImages ?? 1,
    ...(params.imageUrls && { imageUrls: params.imageUrls }),
  }

  return nbProFetch<NBImageGenerateResponse>(`${NB_PRO_BASE_URL}/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getImageStatus(
  taskId: string
): Promise<NBImageStatusResponse> {
  return nbProFetch<NBImageStatusResponse>(
    `${NB_STATUS_BASE_URL}/record-info?taskId=${encodeURIComponent(taskId)}`
  )
}
