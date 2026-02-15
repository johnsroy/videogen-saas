import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { convertVttToAss } from './vtt-to-ass'
import type { CaptionStyles } from './captions'

const execFileAsync = promisify(execFile)

function getFfmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = require('ffmpeg-static') as string
  if (!ffmpegPath) throw new Error('ffmpeg-static binary not found')
  return ffmpegPath
}

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

export async function downloadToFile(url: string, filePath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download: ${url} (${res.status})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  await writeFile(filePath, buffer)
}

export async function composeVideo(params: ComposeParams): Promise<Buffer> {
  const ffmpegPath = getFfmpegPath()
  const workDir = join(tmpdir(), `videogen-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  const inputFile = join(workDir, 'input.mp4')
  const outputFile = join(workDir, 'output.mp4')

  try {
    // Download source video
    await downloadToFile(params.sourceVideoUrl, inputFile)

    const args: string[] = ['-i', inputFile]

    // Download and add voiceover
    let hasVoiceover = false
    if (params.voiceoverUrl) {
      const voFile = join(workDir, 'voiceover.mp3')
      await downloadToFile(params.voiceoverUrl, voFile)
      args.push('-i', voFile)
      hasVoiceover = true
    }

    // Download and add music
    let hasMusic = false
    if (params.musicUrl) {
      const musicFile = join(workDir, 'music.mp3')
      await downloadToFile(params.musicUrl, musicFile)
      args.push('-i', musicFile)
      hasMusic = true
    }

    // Write captions
    let captionFile: string | undefined
    if (params.captionVtt) {
      const assContent = convertVttToAss(params.captionVtt, params.captionStyles)
      captionFile = join(workDir, 'captions.ass')
      await writeFile(captionFile, assContent)
    }

    // Build filter complex
    const origVol = (params.originalAudioVolume ?? 100) / 100
    const voVol = (params.voiceoverVolume ?? 100) / 100
    const musicVol = (params.musicVolume ?? 30) / 100

    const filterParts: string[] = []

    // Video filter: burn in subtitles if present
    if (captionFile) {
      // Escape path for FFmpeg on all platforms
      const escaped = captionFile.replace(/\\/g, '/').replace(/:/g, '\\:')
      filterParts.push(`[0:v]ass='${escaped}'[vout]`)
    }

    // Count audio streams and build mix
    const audioStreams: string[] = []
    let nextInput = 0

    // Original audio
    filterParts.push(`[${nextInput}:a]volume=${origVol}[a_orig]`)
    audioStreams.push('[a_orig]')
    nextInput++

    if (hasVoiceover) {
      filterParts.push(`[${nextInput}:a]volume=${voVol}[a_vo]`)
      audioStreams.push('[a_vo]')
      nextInput++
    }

    if (hasMusic) {
      filterParts.push(`[${nextInput}:a]volume=${musicVol}[a_music]`)
      audioStreams.push('[a_music]')
      nextInput++
    }

    // Mix audio — use weights=1 per stream to prevent amix normalization
    if (audioStreams.length > 1) {
      const weights = audioStreams.map(() => '1').join(' ')
      filterParts.push(
        `${audioStreams.join('')}amix=inputs=${audioStreams.length}:duration=first:dropout_transition=2:weights=${weights}[aout]`
      )
    } else {
      filterParts.push(`${audioStreams[0]}anull[aout]`)
    }

    const filterComplex = filterParts.join(';')

    args.push(
      '-filter_complex', filterComplex,
      ...(captionFile ? ['-map', '[vout]'] : ['-map', '0:v']),
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      '-y',
      outputFile,
    )

    // Run FFmpeg with 5 minute timeout
    await execFileAsync(ffmpegPath, args, {
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
    })

    return await readFile(outputFile)
  } finally {
    // Cleanup entire work directory
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Concatenate multiple video clips and optionally upscale to 4K.
 * Downloads all clips, concatenates with FFmpeg, and returns the composed buffer.
 */
export async function concatenateVideos(
  videoUrls: string[],
  options?: { upscale4K?: boolean; aspectRatio?: '16:9' | '9:16' }
): Promise<Buffer> {
  if (videoUrls.length === 0) throw new Error('No video URLs provided')
  if (videoUrls.length === 1 && !options?.upscale4K) {
    // Single video, no upscale — just download and return
    const res = await fetch(videoUrls[0])
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }

  const ffmpegPath = getFfmpegPath()
  const workDir = join(tmpdir(), `videogen-concat-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  const outputFile = join(workDir, 'output.mp4')

  try {
    // Download all clips in parallel
    const clipPaths: string[] = []
    await Promise.all(
      videoUrls.map(async (url, i) => {
        const clipPath = join(workDir, `clip_${String(i).padStart(3, '0')}.mp4`)
        await downloadToFile(url, clipPath)
        clipPaths[i] = clipPath
      })
    )

    // Write concat list file
    const concatListPath = join(workDir, 'concat.txt')
    const concatContent = clipPaths.map((p) => `file '${p}'`).join('\n')
    await writeFile(concatListPath, concatContent)

    if (options?.upscale4K) {
      // Concatenate + upscale to 4K in a single pass
      const isPortrait = options.aspectRatio === '9:16'
      const scaleFilter = isPortrait
        ? 'scale=2160:3840:flags=lanczos'
        : 'scale=3840:2160:flags=lanczos'

      const args = [
        '-f', 'concat', '-safe', '0', '-i', concatListPath,
        '-vf', scaleFilter,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        '-y', outputFile,
      ]

      await execFileAsync(ffmpegPath, args, {
        timeout: 600_000, // 10 minutes for 4K encoding
        maxBuffer: 10 * 1024 * 1024,
      })
    } else {
      // Fast lossless concat (same codec)
      const args = [
        '-f', 'concat', '-safe', '0', '-i', concatListPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        '-y', outputFile,
      ]

      await execFileAsync(ffmpegPath, args, {
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
      })
    }

    return await readFile(outputFile)
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Upscale a single video to 4K resolution.
 * Downloads the video, upscales with FFmpeg lanczos, returns the buffer.
 */
export async function upscaleVideoTo4K(
  videoUrl: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<Buffer> {
  const ffmpegPath = getFfmpegPath()
  const workDir = join(tmpdir(), `videogen-upscale-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  const inputFile = join(workDir, 'input.mp4')
  const outputFile = join(workDir, 'output_4k.mp4')

  try {
    await downloadToFile(videoUrl, inputFile)

    const isPortrait = aspectRatio === '9:16'
    const scaleFilter = isPortrait
      ? 'scale=2160:3840:flags=lanczos'
      : 'scale=3840:2160:flags=lanczos'

    const args = [
      '-i', inputFile,
      '-vf', scaleFilter,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      '-y', outputFile,
    ]

    await execFileAsync(ffmpegPath, args, {
      timeout: 600_000,
      maxBuffer: 10 * 1024 * 1024,
    })

    return await readFile(outputFile)
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
