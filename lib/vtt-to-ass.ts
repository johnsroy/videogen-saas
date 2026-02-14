import type { CaptionStyles } from './captions'

const FONT_SIZE_MAP: Record<string, number> = {
  small: 18,
  medium: 24,
  large: 32,
}

const POSITION_MAP: Record<string, number> = {
  top: 8,     // ASS: top center
  center: 5,  // ASS: middle center
  bottom: 2,  // ASS: bottom center
}

/** Convert hex color #RRGGBB to ASS color &HBBGGRR& */
function hexToAss(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '&H00FFFFFF'
  const r = clean.slice(0, 2)
  const g = clean.slice(2, 4)
  const b = clean.slice(4, 6)
  return `&H00${b}${g}${r}`
}

/** Convert seconds to ASS timestamp h:mm:ss.cc */
function secondsToAss(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/** Convert WebVTT content + styles to ASS subtitle format for FFmpeg burning */
export function convertVttToAss(vtt: string, styles?: CaptionStyles): string {
  const fontSize = FONT_SIZE_MAP[styles?.fontSize ?? 'medium'] ?? 24
  const color = hexToAss(styles?.color ?? '#ffffff')
  const alignment = POSITION_MAP[styles?.position ?? 'bottom'] ?? 2

  // Background style
  let borderStyle = 1 // outline + shadow
  let outlineSize = 2
  let shadowSize = 0
  let backColor = '&H00000000'

  if (styles?.background === 'dark') {
    borderStyle = 3 // opaque box
    outlineSize = 4
    shadowSize = 0
    backColor = '&H80000000'
  } else if (styles?.background === 'blur') {
    borderStyle = 3
    outlineSize = 6
    shadowSize = 2
    backColor = '&H60000000'
  }

  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},${color},${color},&H00000000,${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${outlineSize},${shadowSize},${alignment},20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

  // Parse VTT cues
  const lines = vtt.split('\n')
  let i = 0
  // Skip header
  while (i < lines.length && !lines[i].includes('-->')) i++

  while (i < lines.length) {
    const line = lines[i].trim()
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->')
      const start = parseVttTime(startStr.trim())
      const end = parseVttTime(endStr.trim())

      const textLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim())
        i++
      }

      const text = textLines.join('\\N')
      ass += `Dialogue: 0,${secondsToAss(start)},${secondsToAss(end)},Default,,0,0,0,,${text}\n`
    }
    i++
  }

  return ass
}

function parseVttTime(ts: string): number {
  // Strip VTT cue settings that may follow the timestamp (e.g. "position:10% align:start")
  const timeOnly = ts.split(/\s/)[0]
  const parts = timeOnly.split(':')
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
