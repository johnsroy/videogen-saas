'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VideoCreatedToast } from './video-created-toast'
import { Maximize2, Loader2, Sparkles, Play, Clock, Film, Info, Volume2, CheckCircle2 } from 'lucide-react'
import type { VideoRecord } from '@/lib/heygen-types'

const EXTENSION_OPTIONS = [
  { value: 4, label: '+4s', group: 'Quick' },
  { value: 6, label: '+6s', group: 'Quick' },
  { value: 8, label: '+8s', group: 'Quick' },
  { value: 15, label: '+15s', group: 'Short', segments: 2 },
  { value: 30, label: '+30s', group: 'Short', segments: 4 },
  { value: 60, label: '+1 min', group: 'Medium', segments: 8 },
  { value: 120, label: '+2 min', group: 'Medium', segments: 15 },
  { value: 300, label: '+5 min', group: 'Long', segments: 38 },
  { value: 600, label: '+10 min', group: 'Long', segments: 75 },
  { value: 900, label: '+15 min', group: 'Long', segments: 113 },
  { value: 1200, label: '+20 min', group: 'Long', segments: 150 },
] as const

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`
}

function formatTimelineWidth(original: number, extension: number): number {
  const total = original + extension
  if (total === 0) return 50
  return Math.max(10, Math.min(90, (original / total) * 100))
}

interface SceneExtenderProps {
  onVideoCreated: (video: Record<string, unknown>) => void
}

export function SceneExtender({ onVideoCreated }: SceneExtenderProps) {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [extendDuration, setExtendDuration] = useState(8)
  const [generateAudio, setGenerateAudio] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Toast + success state
  const [showToast, setShowToast] = useState(false)
  const [toastTitle, setToastTitle] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const selectedVideo = videos.find((v) => v.id === selectedVideoId) ?? null
  const isLongExtension = extendDuration > 8
  const selectedOption = EXTENSION_OPTIONS.find((o) => o.value === extendDuration)
  const segmentCount = selectedOption && 'segments' in selectedOption ? selectedOption.segments : (extendDuration <= 8 ? 1 : Math.ceil(extendDuration / 8))

  // Credit cost estimate (2 credits/sec for standard model)
  const creditCost = useMemo(() => Math.max(1, Math.ceil(extendDuration * 2)), [extendDuration])

  const handleDismissToast = useCallback(() => setShowToast(false), [])

  useEffect(() => {
    async function loadVideos() {
      try {
        const res = await fetch('/api/veo/list')
        if (res.ok) {
          const data = await res.json()
          setVideos(
            (data.videos ?? []).filter(
              (v: VideoRecord) => v.status === 'completed' && v.video_url
            )
          )
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    loadVideos()
  }, [])

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  async function handleExtend() {
    if (!selectedVideoId || !prompt.trim()) return
    setIsGenerating(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch('/api/veo/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          prompt: prompt.trim(),
          extendDurationSeconds: extendDuration,
          generateAudio,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to extend video')
        return
      }
      onVideoCreated(data.video)
      setPrompt('')

      // Show success feedback
      const videoTitle = selectedVideo?.title ?? 'Video'
      setToastTitle(`${videoTitle} (Extended)`)
      setShowToast(true)
      setSuccessMessage(
        isLongExtension
          ? `Extension started! ${segmentCount} clips will be generated and stitched together. Check your gallery for progress.`
          : 'Extension started! Check your gallery for progress.'
      )

      // Dispatch event so gallery updates
      window.dispatchEvent(new CustomEvent('video-created', { detail: data.video }))
    } catch {
      setError('Failed to extend video')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Scene Extender
          </CardTitle>
          <CardDescription>
            Select a completed Veo video and extend it with new content — from a few seconds up to 20 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No completed Veo videos yet. Create one first using Text to Video or Ingredients Studio.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Video to Extend</Label>
                <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a video..." />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <div className="flex items-center gap-2">
                          <Film className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{v.title}</span>
                          <span className="text-muted-foreground text-xs shrink-0">
                            ({v.duration ? formatDuration(v.duration) : 'video'})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Video preview */}
              {selectedVideo && (
                <div className="space-y-2">
                  <div className="relative aspect-video overflow-hidden rounded-lg border bg-black">
                    {selectedVideo.video_url ? (
                      <video
                        src={selectedVideo.video_url}
                        className="h-full w-full object-contain"
                        controls
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Play className="h-8 w-8 text-white/50" />
                      </div>
                    )}
                  </div>

                  {/* Timeline visualization */}
                  <div className="space-y-1">
                    <div className="flex h-7 overflow-hidden rounded-full">
                      <div
                        className="flex items-center justify-center bg-primary/80 text-[10px] font-medium text-primary-foreground transition-all duration-300"
                        style={{
                          width: `${formatTimelineWidth(selectedVideo.duration ?? 8, extendDuration)}%`,
                        }}
                      >
                        Original {selectedVideo.duration ? formatDuration(selectedVideo.duration) : ''}
                      </div>
                      <div className="flex flex-1 items-center justify-center bg-primary/30 text-[10px] font-medium text-primary animate-pulse">
                        +{formatDuration(extendDuration)} extension
                      </div>
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground">
                      Total: ~{formatDuration((selectedVideo.duration ?? 0) + extendDuration)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>What happens next?</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder="The camera pans right to reveal a second product, while the music builds..."
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Extension Duration</Label>
                <Select
                  value={String(extendDuration)}
                  onValueChange={(v) => setExtendDuration(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Quick Extensions</SelectLabel>
                      {EXTENSION_OPTIONS.filter((o) => o.group === 'Quick').map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Short Extensions</SelectLabel>
                      {EXTENSION_OPTIONS.filter((o) => o.group === 'Short').map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label} ({o.segments} clips)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Medium Extensions</SelectLabel>
                      {EXTENSION_OPTIONS.filter((o) => o.group === 'Medium').map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label} ({o.segments} clips)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Long Extensions</SelectLabel>
                      {EXTENSION_OPTIONS.filter((o) => o.group === 'Long').map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label} ({o.segments} clips)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Audio toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Generate Audio</p>
                    <p className="text-[10px] text-muted-foreground">AI-generated sound effects and ambient audio for the extension</p>
                  </div>
                </div>
                <Switch checked={generateAudio} onCheckedChange={setGenerateAudio} />
              </div>

              {/* Info box for long extensions */}
              {isLongExtension && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Info className="h-3.5 w-3.5 text-primary" />
                    Multi-Clip Extension
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This extension will generate {segmentCount} clips and concatenate them with your
                    original video. Generation runs in the background — you can close this page.
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <Film className="h-3 w-3" />
                      {segmentCount} clips
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{Math.ceil(segmentCount * 1.5)} min to generate
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {creditCost} credits
                    </span>
                  </div>
                </div>
              )}

              {/* Credit cost for short extensions */}
              {!isLongExtension && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {creditCost} credits
                </p>
              )}

              {/* Success banner */}
              {successMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={handleExtend}
                disabled={isGenerating || !selectedVideoId || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLongExtension ? 'Starting extension...' : 'Extending...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Extend Video {isLongExtension ? `(${segmentCount} clips)` : `(+${formatDuration(extendDuration)})`}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <VideoCreatedToast
        visible={showToast}
        title={toastTitle}
        onDismiss={handleDismissToast}
      />
    </>
  )
}
