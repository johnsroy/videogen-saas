'use client'

import { useState, useEffect } from 'react'
import { Film, Play, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { VideoEditingPanel } from './video-editing-panel'
import type { VideoRecord } from '@/lib/heygen-types'
import type { PlanId } from '@/lib/plans'

interface VideoEditorHubProps {
  completedVideos: VideoRecord[]
  planId: PlanId
  videosThisMonth: number
  creditsRemaining: number
}

export function VideoEditorHub({
  completedVideos,
  planId,
  videosThisMonth,
  creditsRemaining,
}: VideoEditorHubProps) {
  const [videos, setVideos] = useState<VideoRecord[]>(completedVideos)
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null)
  const [search, setSearch] = useState('')

  // Listen for new completed videos
  useEffect(() => {
    function handleNewVideo(e: Event) {
      const detail = (e as CustomEvent<VideoRecord>).detail
      if (detail.status === 'completed') {
        setVideos((prev) => [detail, ...prev])
      }
    }
    window.addEventListener('video-created', handleNewVideo)
    return () => window.removeEventListener('video-created', handleNewVideo)
  }, [])

  const filtered = search.trim()
    ? videos.filter((v) =>
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        v.prompt?.toLowerCase().includes(search.toLowerCase())
      )
    : videos

  return (
    <div className="space-y-4">
      {/* Video Selection Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Select a Video to Edit</span>
          <span className="text-xs text-muted-foreground">({videos.length} videos)</span>
        </div>

        {videos.length > 6 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}

        {/* Horizontal scrollable video thumbnails */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-6 w-full">
              <p className="text-xs text-muted-foreground">
                {videos.length === 0
                  ? 'No completed videos yet. Generate a video first!'
                  : 'No videos match your search.'}
              </p>
            </div>
          ) : (
            filtered.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className={`flex-shrink-0 w-36 rounded-lg border overflow-hidden transition-all ${
                  selectedVideo?.id === video.id
                    ? 'border-primary ring-2 ring-primary/20 shadow-md'
                    : 'border-border hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="relative aspect-video bg-muted flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Play className="h-6 w-6 text-muted-foreground/40" />
                  )}
                  {video.provider === 'google_veo' && (
                    <span className="absolute top-1 right-1 rounded-full bg-blue-100 px-1 py-0.5 text-[8px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Veo
                    </span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-[11px] font-medium text-left">{video.title}</p>
                  <p className="text-[10px] text-muted-foreground text-left">
                    {new Date(video.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {video.duration ? ` · ${video.duration}s` : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editing Panel */}
      {selectedVideo ? (
        <VideoEditingPanel
          video={selectedVideo}
          planId={planId}
          videosThisMonth={videosThisMonth}
          creditsRemaining={creditsRemaining}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Film className="h-10 w-10 text-muted-foreground/20" />
          <p className="mt-3 text-sm text-muted-foreground">
            Select a video above to start editing
          </p>
          <p className="text-xs text-muted-foreground/60">
            Add voiceovers, edit captions, mix background music
          </p>
        </div>
      )}
    </div>
  )
}
