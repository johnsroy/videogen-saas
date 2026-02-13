const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions'
const MUSICGEN_MODEL = 'meta/musicgen:b05b1dff1d8c386b65adc005f3f8f884f310f150c702e4af2f0ec9f735c4ad8d'

function getReplicateToken(): string {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN is not set')
  return token
}

export interface MusicGenParams {
  prompt: string
  duration_seconds?: number
}

interface ReplicatePrediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string
  error?: string
  urls: { get: string }
}

/** Generate music using Meta MusicGen via Replicate. Returns the audio URL. */
export async function generateMusic(params: MusicGenParams): Promise<string> {
  const token = getReplicateToken()

  // Create prediction
  const createRes = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: MUSICGEN_MODEL.split(':')[1],
      input: {
        prompt: params.prompt,
        duration: params.duration_seconds ?? 15,
        model_version: 'stereo-melody-large',
        output_format: 'mp3',
        normalization_strategy: 'peak',
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Replicate create error ${createRes.status}: ${err}`)
  }

  let prediction: ReplicatePrediction = await createRes.json()

  // If not completed yet (Prefer: wait should handle most cases), poll
  const maxAttempts = 60
  let attempts = 0
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
    if (attempts++ >= maxAttempts) {
      throw new Error('Music generation timed out')
    }
    await new Promise((r) => setTimeout(r, 2000))

    const pollRes = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!pollRes.ok) {
      throw new Error(`Replicate poll error ${pollRes.status}`)
    }
    prediction = await pollRes.json()
  }

  if (prediction.status === 'failed') {
    throw new Error(`Music generation failed: ${prediction.error || 'Unknown error'}`)
  }
  if (prediction.status === 'canceled') {
    throw new Error('Music generation was canceled')
  }

  if (!prediction.output) {
    throw new Error('No audio output returned')
  }

  return prediction.output
}
