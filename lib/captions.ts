function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end of string
  const raw = text.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g)
  if (!raw) return [text]
  return raw.map((s) => s.trim()).filter(Boolean)
}

export function generateWebVTT(script: string, durationSeconds: number): string {
  const sentences = splitIntoSentences(script)
  if (sentences.length === 0) return 'WEBVTT\n'

  const timePerSentence = durationSeconds / sentences.length
  let vtt = 'WEBVTT\n\n'

  for (let i = 0; i < sentences.length; i++) {
    const start = i * timePerSentence
    const end = Math.min((i + 1) * timePerSentence, durationSeconds)
    vtt += `${formatTime(start)} --> ${formatTime(end)}\n`
    vtt += `${sentences[i]}\n\n`
  }

  return vtt
}
