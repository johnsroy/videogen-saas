'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Film, Play } from 'lucide-react'
import { VideoStatusBadge } from './video-status-badge'
import { VideoPlayerDialog } from './video-player-dialog'
import { VideoProgressBar } from './video-progress-bar'
import type { VideoRecord } from '@/lib/heygen-types'

interface VideoGalleryProps {
  initialVideos: VideoRecord[]
}

export function VideoGallery({ initialVideos }: VideoGalleryProps) {
  const [videos, setVideos] = useState<VideoRecord[]>(initialVideos)
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null)

  // Listen for new video events from the generation card
  useEffect(() => {
    function handleNewVideo(e: Event) {
      const customEvent = e as CustomEvent<VideoRecord>
      setVideos((prev) => [customEvent.detail, ...prev])
    }
    window.addEventListener('video-created', handleNewVideo)
    return () => window.removeEventListener('video-created', handleNewVideo)
  }, [])

  // Poll for status updates on pending/processing videos
  const pollStatuses = useCallback(async () => {
    const pendingVideos = videos.filter(
      (v) => v.status === 'pending' || v.status === 'processing'
    )
    if (pendingVideos.length === 0) return

    for (const video of pendingVideos) {
      try {
        const res = await fetch(`/api/heygen/status/${video.id}`)
        if (res.ok) {
          const { video: updatedVideo } = await res.json()
          if (updatedVideo) {
            setVideos((prev) =>
              prev.map((v) => (v.id === video.id ? updatedVideo : v))
            )
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }
  }, [videos])

  useEffect(() => {
    const hasPending = videos.some(
      (v) => v.status === 'pending' || v.status === 'processing'
    )
    if (!hasPending) return

    const interval = setInterval(pollStatuses, 5000)
    return () => clearInterval(interval)
  }, [videos, pollStatuses])

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

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Your Videos</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
          <Card
            key={video.id}
            className={`overflow-hidden transition-shadow ${video.status === 'completed' ? 'cursor-pointer hover:shadow-md' : ''}`}
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
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{video.title}</p>
                <VideoStatusBadge status={video.status} />
              </div>
              {isProcessing(video.status) ? (
                <VideoProgressBar createdAt={video.created_at} />
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
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
