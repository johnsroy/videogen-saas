import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { convertVttToAss } from './vtt-to-ass'
import type { CaptionStyles } from './captions'

export interface ComposeParams {
  sourceVideoUrl: string
  voiceoverUrl?: string
  voiceoverVolume?: number      // 0-100
  captionVtt?: string
  captionStyles?: CaptionStyles
  musicUrl?: string
  musicVolume?: number          // 0-100
  originalAudioVolume?: number  // 0-100
}

async function downloadToBuffer(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download: ${url}`)
  return new Uint8Array(await res.arrayBuffer())
}

export async function composeVideo(params: ComposeParams): Promise<Buffer> {
  const ffmpeg = new FFmpeg()

  // Load FFmpeg WASM from CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  // Download source video
  const videoData = await downloadToBuffer(params.sourceVideoUrl)
  await ffmpeg.writeFile('input.mp4', videoData)

  const inputs = ['-i', 'input.mp4']
  const filterParts: string[] = []
  let audioInputCount = 1 // input.mp4 is [0]
  let inputIndex = 1

  const origVol = (params.originalAudioVolume ?? 100) / 100

  // Write voiceover if provided
  if (params.voiceoverUrl) {
    const voData = await downloadToBuffer(params.voiceoverUrl)
    await ffmpeg.writeFile('voiceover.mp3', voData)
    inputs.push('-i', 'voiceover.mp3')
    audioInputCount++
    inputIndex++
  }

  // Write music if provided
  if (params.musicUrl) {
    const musicData = await downloadToBuffer(params.musicUrl)
    await ffmpeg.writeFile('music.mp3', musicData)
    inputs.push('-i', 'music.mp3')
    audioInputCount++
    inputIndex++
  }

  // Write subtitles if provided
  if (params.captionVtt) {
    const assContent = convertVttToAss(params.captionVtt, params.captionStyles)
    await ffmpeg.writeFile('subs.ass', new TextEncoder().encode(assContent))
  }

  // Build filter complex
  const voVol = (params.voiceoverVolume ?? 100) / 100
  const musicVol = (params.musicVolume ?? 30) / 100

  // Video filter: burn in subtitles if present
  const videoFilter = params.captionVtt
    ? `[0:v]ass=subs.ass[vout]`
    : `[0:v]copy[vout]`

  filterParts.push(videoFilter)

  // Audio mixing
  if (audioInputCount === 1) {
    // Only original audio
    filterParts.push(`[0:a]volume=${origVol}[aout]`)
  } else {
    // Mix multiple audio sources
    const audioStreams: string[] = []
    let streamIdx = 0

    // Original audio
    filterParts.push(`[0:a]volume=${origVol}[a${streamIdx}]`)
    audioStreams.push(`[a${streamIdx}]`)
    streamIdx++

    let nextInput = 1
    if (params.voiceoverUrl) {
      filterParts.push(`[${nextInput}:a]volume=${voVol}[a${streamIdx}]`)
      audioStreams.push(`[a${streamIdx}]`)
      streamIdx++
      nextInput++
    }

    if (params.musicUrl) {
      filterParts.push(`[${nextInput}:a]volume=${musicVol}[a${streamIdx}]`)
      audioStreams.push(`[a${streamIdx}]`)
      streamIdx++
    }

    filterParts.push(
      `${audioStreams.join('')}amix=inputs=${audioStreams.length}:duration=first:dropout_transition=2[aout]`
    )
  }

  const filterComplex = filterParts.join(';')

  // Run FFmpeg
  await ffmpeg.exec([
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    'output.mp4',
  ])

  // Read output
  const outputData = await ffmpeg.readFile('output.mp4')
  await ffmpeg.terminate()

  return Buffer.from(outputData as Uint8Array)
}
