'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Film, Play, Download, Maximize2, X, Loader2 } from 'lucide-react'
import { VideoStatusBadge } from '../video-status-badge'
import { VideoProgressBar } from '../video-progress-bar'
import { VideoPlayerDialog } from '../video-player-dialog'
import type { VideoRecord } from '@/lib/heygen-types'

/** Adaptive polling interval based on elapsed time since first pending video */
function getPollingInterval(oldestPendingCreatedAt: string): number {
  const elapsed = Date.now() - new Date(oldestPendingCreatedAt).getTime()
  const minutes = elapsed / 60_000
  if (minutes < 2) return 10_000   // First 2 min: every 10s
  if (minutes < 5) return 15_000   // 2-5 min: every 15s
  if (minutes < 10) return 30_000  // 5-10 min: every 30s
  return 60_000                    // 10+ min: every 60s
}

interface StudioGalleryProps {
  onExtendVideo?: (videoId: string) => void
}

export function StudioGallery({ onExtendVideo }: StudioGalleryProps) {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function loadVideos() {
      try {
        const res = await fetch('/api/veo/list')
        if (res.ok) {
          const data = await res.json()
          setVideos(data.videos ?? [])
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    loadVideos()
  }, [])

  // Listen for new video events
  useEffect(() => {
    function handleNewVideo(e: Event) {
      const video = (e as CustomEvent<VideoRecord>).detail
      if (video.provider === 'google_veo') {
        setVideos((prev) => [video, ...prev])
      }
    }
    window.addEventListener('video-created', handleNewVideo)
    return () => window.removeEventListener('video-created', handleNewVideo)
  }, [])

  // Poll for status updates
  const pollStatuses = useCallback(async () => {
    const pending = videos.filter(
      (v) => v.status === 'pending' || v.status === 'processing'
    )
    if (pending.length === 0) return

    for (const video of pending) {
      if (!video.veo_operation_name) continue
      try {
        const res = await fetch(
          `/api/veo/status/${encodeURIComponent(video.veo_operation_name)}`
        )
        if (res.ok) {
          const { video: updated } = await res.json()
          if (updated) {
            setVideos((prev) =>
              prev.map((v) => (v.id === video.id ? { ...v, ...updated } : v))
            )
          }
        }
      } catch {
        // ignore
      }
    }
  }, [videos])

  // Adaptive polling with exponential backoff
  useEffect(() => {
    const pending = videos.filter(
      (v) => v.status === 'pending' || v.status === 'processing'
    )
    if (pending.length === 0) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    // Find oldest pending video to determine polling interval
    const oldest = pending.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b
    )
    const interval = getPollingInterval(oldest.created_at)

    function schedulePoll() {
      timerRef.current = setTimeout(async () => {
        await pollStatuses()
        schedulePoll()
      }, interval)
    }

    schedulePoll()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [videos, pollStatuses])

  async function handleCancel(videoId: string) {
    setCancellingId(videoId)
    try {
      const res = await fetch('/api/veo/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })
      if (res.ok) {
        const { video: updated } = await res.json()
        if (updated) {
          setVideos((prev) =>
            prev.map((v) => (v.id === videoId ? { ...v, ...updated } : v))
          )
        }
      }
    } catch {
      // ignore
    } finally {
      setCancellingId(null)
    }
  }

  const filteredVideos = modeFilter === 'all'
    ? videos
    : videos.filter((v) => v.mode === modeFilter)

  const isProcessing = (status: string) =>
    status === 'pending' || status === 'processing'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">My Veo Videos ({videos.length})</h3>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="ugc">Text to Video</SelectItem>
            <SelectItem value="ingredients">Ingredients</SelectItem>
            <SelectItem value="shot_design">Shot Design</SelectItem>
            <SelectItem value="extension">Extensions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredVideos.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Film className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">
              No Veo videos yet. Create your first video using the tabs above!
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <Card
              key={video.id}
              className={`overflow-hidden transition-shadow ${
                video.status === 'completed' ? 'cursor-pointer hover:shadow-md' : ''
              }`}
              onClick={() =>
                video.status === 'completed' ? setSelectedVideo(video) : null
              }
            >
              <div className="relative aspect-video bg-muted flex items-center justify-center">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : isProcessing(video.status) ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {video.status === 'pending' ? 'Queued...' : 'Rendering...'}
                    </p>
                  </div>
                ) : video.status === 'completed' ? (
                  <Play className="h-10 w-10 text-muted-foreground/40" />
                ) : (
                  <Film className="h-8 w-8 text-muted-foreground/30" />
                )}

                {/* Cancel button overlay for processing videos */}
                {isProcessing(video.status) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-7 gap-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancel(video.id)
                    }}
                    disabled={cancellingId === video.id}
                  >
                    {cancellingId === video.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    Cancel
                  </Button>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{video.title}</p>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {video.veo_model === 'veo-3.1-fast-generate-preview' ? 'Fast' : 'HD'}
                    </span>
                    {video.audio_enabled && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Audio
                      </span>
                    )}
                    <VideoStatusBadge status={video.status} />
                  </div>
                </div>
                {isProcessing(video.status) ? (
                  <VideoProgressBar createdAt={video.created_at} />
                ) : (
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {video.credits_used} credits
                    </p>
                    {video.status === 'completed' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            const url = video.video_url?.includes('supabase.co/storage/')
                              ? video.video_url
                              : `/api/veo/download/${video.id}`
                            window.open(url, '_blank')
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {onExtendVideo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              onExtendVideo(video.id)
                            }}
                          >
                            <Maximize2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {video.status === 'failed' && video.error_message && (
                  <p className="mt-1 text-xs text-destructive">{video.error_message}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedVideo && (
        <VideoPlayerDialog
          video={selectedVideo}
          open={!!selectedVideo}
          onOpenChange={(open) => !open && setSelectedVideo(null)}
        />
      )}
    </>
  )
}
