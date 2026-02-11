const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1'

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return key
}

export async function chatCompletion(params: {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}): Promise<{ content: string }> {
  const res = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: params.maxTokens ?? 2000,
      temperature: params.temperature ?? 0.7,
      system: params.system,
      messages: [{ role: 'user', content: params.user }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${body}`)
  }
  const data = await res.json()
  return {
    content: data.content[0].text,
  }
}
