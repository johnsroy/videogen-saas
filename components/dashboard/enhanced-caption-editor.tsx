'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Captions,
  Loader2,
  Plus,
  Trash2,
  Download,
  Save,
  Check,
} from 'lucide-react'
import {
  parseWebVTT,
  serializeWebVTT,
  formatTime,
  DEFAULT_CAPTION_STYLES,
  type CaptionCue,
  type CaptionStyles,
} from '@/lib/captions'
import type { VideoRecord } from '@/lib/heygen-types'

const FONT_SIZES = [
  { id: 'small', label: 'S' },
  { id: 'medium', label: 'M' },
  { id: 'large', label: 'L' },
] as const

const COLOR_SWATCHES = [
  '#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff4444', '#000000',
]

const POSITIONS = [
  { id: 'top', label: 'Top' },
  { id: 'center', label: 'Center' },
  { id: 'bottom', label: 'Bottom' },
] as const

const BACKGROUNDS = [
  { id: 'none', label: 'None' },
  { id: 'dark', label: 'Dark' },
  { id: 'blur', label: 'Blur' },
] as const

interface EnhancedCaptionEditorProps {
  video: VideoRecord
  videoElement: HTMLVideoElement | null
  onCaptionSaved?: (captionContent: string, styles: Record<string, string>) => void
}

export function EnhancedCaptionEditor({ video, videoElement, onCaptionSaved }: EnhancedCaptionEditorProps) {
  const [cues, setCues] = useState<CaptionCue[]>([])
  const [styles, setStyles] = useState<CaptionStyles>(DEFAULT_CAPTION_STYLES)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trackUrlRef = useRef<string | null>(null)

  // Load existing captions on video change
  useEffect(() => {
    if (!video.id) return
    setIsLoading(true)
    setError(null)
    setCues([])

    fetch(`/api/captions/${video.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.caption?.content) {
          setCues(parseWebVTT(data.caption.content))
          if (data.caption.styles && Object.keys(data.caption.styles).length > 0) {
            setStyles({ ...DEFAULT_CAPTION_STYLES, ...data.caption.styles })
          }
        }
      })
      .catch(() => setError('Failed to load captions'))
      .finally(() => setIsLoading(false))
  }, [video.id])

  // Live preview: inject track into video
  useEffect(() => {
    if (!videoElement || cues.length === 0) return

    // Clean up previous URL
    if (trackUrlRef.current) {
      URL.revokeObjectURL(trackUrlRef.current)
    }

    const vtt = serializeWebVTT(cues)
    const blob = new Blob([vtt], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    trackUrlRef.current = url

    // Remove existing tracks
    const existingTracks = videoElement.querySelectorAll('track')
    existingTracks.forEach((t) => t.remove())

    // Add new track
    const track = document.createElement('track')
    track.kind = 'subtitles'
    track.label = 'Captions'
    track.srclang = 'en'
    track.src = url
    track.default = true
    videoElement.appendChild(track)

    // Enable track
    if (videoElement.textTracks[0]) {
      videoElement.textTracks[0].mode = 'showing'
    }

    return () => {
      if (trackUrlRef.current) {
        URL.revokeObjectURL(trackUrlRef.current)
        trackUrlRef.current = null
      }
    }
  }, [videoElement, cues])

  async function handleGenerate() {
    if (!video.id) return
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: video.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.caption?.content) {
        setCues(parseWebVTT(data.caption.content))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate captions')
    } finally {
      setIsGenerating(false)
    }
  }

  function updateCue(index: number, updates: Partial<CaptionCue>) {
    setCues((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    )
    setSaved(false)
  }

  function deleteCue(index: number) {
    setCues((prev) => prev.filter((_, i) => i !== index).map((c, i) => ({ ...c, index: i })))
    setSaved(false)
  }

  function addCue() {
    const lastCue = cues[cues.length - 1]
    const startTime = lastCue ? lastCue.endTime : 0
    setCues((prev) => [
      ...prev,
      { index: prev.length, startTime, endTime: startTime + 3, text: 'New caption' },
    ])
    setSaved(false)
  }

  function seekTo(time: number) {
    if (videoElement) {
      videoElement.currentTime = time
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)

    try {
      const content = serializeWebVTT(cues)
      const res = await fetch(`/api/captions/${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, styles }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      onCaptionSaved?.(content, styles as unknown as Record<string, string>)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save captions')
    } finally {
      setIsSaving(false)
    }
  }

  function handleDownload() {
    const content = serializeWebVTT(cues)
    const blob = new Blob([content], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `captions-${video.title || video.id}.vtt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseTimeInput(value: string): number {
    const parts = value.split(':')
    if (parts.length === 2) {
      const [m, s] = parts
      return parseInt(m || '0') * 60 + parseFloat(s || '0')
    }
    return parseFloat(value) || 0
  }

  function formatTimeShort(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = (seconds % 60).toFixed(1)
    return `${m}:${s.padStart(4, '0')}`
  }

  const hasScript = !!(video.script || video.prompt)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Captions className="h-4 w-4" />
          Caption Editor
        </CardTitle>
        <CardDescription className="text-xs">
          Edit caption text, timing, and visual style with live preview
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && cues.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-xs text-muted-foreground">
              {hasScript ? 'Generate captions from your script' : 'No script available for this video'}
            </p>
            {hasScript && (
              <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Captions className="mr-1.5 h-3.5 w-3.5" />
                    Generate Captions
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Cue List */}
        {cues.length > 0 && (
          <>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {cues.map((cue, i) => (
                <div
                  key={`cue-${i}`}
                  className="flex items-start gap-2 rounded border px-2 py-1.5 text-xs group"
                >
                  <button
                    onClick={() => seekTo(cue.startTime)}
                    className="text-[10px] text-primary hover:underline whitespace-nowrap mt-0.5 flex-shrink-0"
                  >
                    {formatTimeShort(cue.startTime)}
                  </button>
                  <span className="text-[10px] text-muted-foreground mt-0.5 flex-shrink-0">-</span>
                  <Input
                    value={formatTimeShort(cue.endTime)}
                    onChange={(e) => updateCue(i, { endTime: parseTimeInput(e.target.value) })}
                    className="h-5 w-14 text-[10px] px-1 flex-shrink-0"
                  />
                  <Input
                    value={cue.text}
                    onChange={(e) => updateCue(i, { text: e.target.value })}
                    className="h-5 text-[10px] px-1 flex-1"
                  />
                  <button
                    onClick={() => deleteCue(i)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="ghost" size="sm" onClick={addCue} className="text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Add Caption
            </Button>

            {/* Style Controls */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Style</Label>
              <div className="flex flex-wrap gap-3">
                {/* Font Size */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Size</span>
                  {FONT_SIZES.map((fs) => (
                    <button
                      key={fs.id}
                      onClick={() => setStyles((s) => ({ ...s, fontSize: fs.id }))}
                      className={`h-5 w-5 rounded text-[10px] font-bold ${
                        styles.fontSize === fs.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {fs.label}
                    </button>
                  ))}
                </div>

                {/* Color */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Color</span>
                  {COLOR_SWATCHES.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStyles((s) => ({ ...s, color }))}
                      className={`h-4 w-4 rounded-full border ${
                        styles.color === color ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Position */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Pos</span>
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setStyles((s) => ({ ...s, position: pos.id }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        styles.position === pos.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                {/* Background */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">BG</span>
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setStyles((s) => ({ ...s, background: bg.id }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        styles.background === bg.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {saved ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Saved
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1 h-3.5 w-3.5" />
                    Save
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-1 h-3.5 w-3.5" />
                Download .vtt
              </Button>
            </div>
          </>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
