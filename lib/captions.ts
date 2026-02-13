export interface CaptionCue {
  index: number
  startTime: number
  endTime: number
  text: string
}

export interface CaptionStyles {
  fontSize: 'small' | 'medium' | 'large'
  color: string
  position: 'top' | 'center' | 'bottom'
  background: 'none' | 'dark' | 'blur'
}

export const DEFAULT_CAPTION_STYLES: CaptionStyles = {
  fontSize: 'medium',
  color: '#ffffff',
  position: 'bottom',
  background: 'dark',
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

function parseTimeStamp(ts: string): number {
  const parts = ts.trim().split(':')
  if (parts.length === 3) {
    const [h, m, rest] = parts
    const [s, ms] = rest.split('.')
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms || '0') / 1000
  }
  if (parts.length === 2) {
    const [m, rest] = parts
    const [s, ms] = rest.split('.')
    return parseInt(m) * 60 + parseInt(s) + parseInt(ms || '0') / 1000
  }
  return 0
}

export function parseWebVTT(vtt: string): CaptionCue[] {
  const cues: CaptionCue[] = []
  const lines = vtt.split('\n')
  let i = 0

  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++
  }

  let index = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->')
      const startTime = parseTimeStamp(startStr)
      const endTime = parseTimeStamp(endStr)

      // Collect text lines until empty line
      const textLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim())
        i++
      }

      cues.push({ index, startTime, endTime, text: textLines.join('\n') })
      index++
    }
    i++
  }

  return cues
}

export function serializeWebVTT(cues: CaptionCue[]): string {
  let vtt = 'WEBVTT\n\n'
  for (const cue of cues) {
    vtt += `${formatTime(cue.startTime)} --> ${formatTime(cue.endTime)}\n`
    vtt += `${cue.text}\n\n`
  }
  return vtt
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
