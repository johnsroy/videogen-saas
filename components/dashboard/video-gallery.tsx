'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Film, Play, Loader2, X, Trash2, Volume2 } from 'lucide-react'
import { VideoStatusBadge } from './video-status-badge'
import { VideoPlayerDialog } from './video-player-dialog'
import { VideoProgressBar } from './video-progress-bar'
import type { VideoRecord } from '@/lib/heygen-types'

/** Adaptive polling interval based on elapsed time */
function getPollingInterval(oldestPendingCreatedAt: string): number {
  const elapsed = Date.now() - new Date(oldestPendingCreatedAt).getTime()
  const minutes = elapsed / 60_000
  if (minutes < 2) return 10_000   // First 2 min: every 10s
  if (minutes < 5) return 15_000   // 2-5 min: every 15s
  if (minutes < 10) return 30_000  // 5-10 min: every 30s
  return 60_000                    // 10+ min: every 60s
}

interface VideoGalleryProps {
  initialVideos: VideoRecord[]
}

export function VideoGallery({ initialVideos }: VideoGalleryProps) {
  const [videos, setVideos] = useState<VideoRecord[]>(initialVideos)
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videosRef = useRef(videos)
  videosRef.current = videos

  // Listen for new video events from the generation card
  useEffect(() => {
    function handleNewVideo(e: Event) {
      const customEvent = e as CustomEvent<VideoRecord>
      setVideos((prev) => [customEvent.detail, ...prev])
    }
    window.addEventListener('video-created', handleNewVideo)
    return () => window.removeEventListener('video-created', handleNewVideo)
  }, [])

  // Poll for status updates on pending/processing videos (multi-provider)
  const pollStatuses = useCallback(async () => {
    const pendingVideos = videosRef.current.filter(
      (v) => v.status === 'pending' || v.status === 'processing'
    )
    if (pendingVideos.length === 0) return

    // Poll all pending videos in parallel
    const results = await Promise.allSettled(
      pendingVideos.map(async (video) => {
        let url: string
        if (video.provider === 'google_veo' && video.veo_operation_name) {
          url = `/api/veo/status/${encodeURIComponent(video.veo_operation_name)}`
        } else if (video.provider === 'nanobanana') {
          return null
        } else {
          url = `/api/heygen/status/${video.id}`
        }

        const res = await fetch(url)
        if (!res.ok) return null
        const { video: updatedVideo } = await res.json()
        return updatedVideo ? { id: video.id, ...updatedVideo } : null
      })
    )

    const updates = results
      .filter((r): r is PromiseFulfilledResult<{ id: string }> => r.status === 'fulfilled' && r.value != null)
      .map((r) => r.value)

    if (updates.length > 0) {
      setVideos((prev) =>
        prev.map((v) => {
          const update = updates.find((u) => u.id === v.id)
          return update ? { ...v, ...update } : v
        })
      )
    }
  }, [])

  // Adaptive polling — uses ref so timer doesn't restart on every state change
  useEffect(() => {
    function schedulePoll() {
      const pending = videosRef.current.filter(
        (v) => v.status === 'pending' || v.status === 'processing'
      )
      if (pending.length === 0) return

      const oldest = pending.reduce((a, b) =>
        new Date(a.created_at) < new Date(b.created_at) ? a : b
      )
      const interval = getPollingInterval(oldest.created_at)

      timerRef.current = setTimeout(async () => {
        await pollStatuses()
        schedulePoll()
      }, interval)
    }

    schedulePoll()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pollStatuses])

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

  async function handleDelete(videoId: string) {
    if (confirmDeleteId !== videoId) {
      setConfirmDeleteId(videoId)
      return
    }
    setDeletingId(videoId)
    setConfirmDeleteId(null)
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' })
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId))
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  if (videos.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Film className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">
            No videos yet. Create your first video above!
          </p>
        </div>
      </Card>
    )
  }

  const isProcessing = (status: string) => status === 'pending' || status === 'processing'

  // Sort: processing videos first, then by created_at desc
  const sortedVideos = [...videos].sort((a, b) => {
    const aProcessing = isProcessing(a.status) ? 0 : 1
    const bProcessing = isProcessing(b.status) ? 0 : 1
    if (aProcessing !== bProcessing) return aProcessing - bProcessing
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const processingVideos = videos.filter((v) => isProcessing(v.status))

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Your Videos</h2>

      {processingVideos.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {processingVideos.length} video{processingVideos.length > 1 ? 's' : ''} generating
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {processingVideos.map((v, i) => (
                <span key={v.id} className="text-xs text-muted-foreground">
                  {i + 1}. {v.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedVideos.map((video) => (
          <Card
            key={video.id}
            className={`overflow-hidden transition-shadow ${video.status === 'completed' ? 'cursor-pointer hover:shadow-md' : ''}`}
            onClick={() =>
              video.status === 'completed' ? setSelectedVideo(video) : null
            }
          >
            <div className="group/thumb relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
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
              ) : video.status === 'completed' && video.video_url ? (
                <VideoThumbnail video={video} />
              ) : video.status === 'completed' ? (
                <Play className="h-10 w-10 text-muted-foreground/40" />
              ) : (
                <Film className="h-8 w-8 text-muted-foreground/30" />
              )}

              {/* Cancel button overlay */}
              {isProcessing(video.status) && video.provider === 'google_veo' && (
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
                  {video.provider === 'google_veo' && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Veo 3.1
                    </span>
                  )}
                  {video.provider === 'google_veo' && video.audio_enabled && (
                    <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Audio
                    </span>
                  )}
                  {video.provider === 'nanobanana' && (
                    <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      NB
                    </span>
                  )}
                  {video.provider === 'edited' && (
                    <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      Edited
                    </span>
                  )}
                  <VideoStatusBadge status={video.status} />
                </div>
              </div>
              {isProcessing(video.status) ? (
                <VideoProgressBar createdAt={video.created_at} veoModel={video.veo_model} />
              ) : (
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {(video.status === 'completed' || video.status === 'failed') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 ${confirmDeleteId === video.id ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(video.id)
                      }}
                      disabled={deletingId === video.id}
                      title={confirmDeleteId === video.id ? 'Click again to confirm' : 'Delete video'}
                    >
                      {deletingId === video.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
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

/** Video thumbnail that shows a frame from the video on hover */
function VideoThumbnail({ video }: { video: VideoRecord }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)

  const isPersistedVeo = video.provider === 'google_veo' && video.video_url?.includes('supabase.co/storage/')
  const needsProxy = video.provider === 'google_veo' && !isPersistedVeo
  const videoSrc = useMemo(
    () => needsProxy ? `/api/veo/download/${video.id}` : video.video_url!,
    [needsProxy, video.id, video.video_url]
  )

  return (
    <>
      <video
        ref={videoRef}
        src={videoSrc}
        muted
        preload="metadata"
        playsInline
        onLoadedData={() => setLoaded(true)}
        onMouseEnter={() => videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => {
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
        }}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Play className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}
      {/* Hover play overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover/thumb:bg-black/20">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/0 transition-all duration-200 group-hover/thumb:bg-white/80 group-hover/thumb:scale-100 scale-75 opacity-0 group-hover/thumb:opacity-100">
          <Play className="h-4 w-4 text-black ml-0.5" />
        </div>
      </div>
      {/* Duration badge */}
      {video.duration && (
        <div className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
          {Math.round(video.duration)}s
        </div>
      )}
    </>
  )
}
