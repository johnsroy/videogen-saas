'use client'

import { useState, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mic, Captions, Music, Sparkles } from 'lucide-react'
import { AiVoiceoverStudio } from './ai-voiceover-studio'
import { EnhancedCaptionEditor } from './enhanced-caption-editor'
import { BackgroundMusicMixer } from './background-music-mixer'
import { VideoRemixStudio } from './video-remix-studio'
import type { VideoRecord } from '@/lib/heygen-types'
import type { PlanId } from '@/lib/plans'

interface VideoEditingPanelProps {
  video: VideoRecord
  planId: PlanId
  videosThisMonth: number
  creditsRemaining: number
}

export function VideoEditingPanel({
  video,
  planId,
  videosThisMonth,
  creditsRemaining,
}: VideoEditingPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)

  function handleVideoRef(el: HTMLVideoElement | null) {
    videoRef.current = el
    setVideoElement(el)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Left: Video Preview */}
      <div className="lg:col-span-2 space-y-2">
        <div className="rounded-lg overflow-hidden border bg-black">
          {video.video_url ? (
            <video
              ref={handleVideoRef}
              src={video.video_url}
              controls
              className="w-full aspect-video"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Video not available</p>
            </div>
          )}
        </div>
        <div className="px-1">
          <p className="text-sm font-medium truncate">{video.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {video.prompt || video.script || 'No description'}
          </p>
        </div>
      </div>

      {/* Right: Tool Tabs */}
      <div className="lg:col-span-3">
        <Tabs defaultValue="voiceover">
          <TabsList className="w-full">
            <TabsTrigger value="voiceover" className="gap-1.5 text-xs">
              <Mic className="h-3.5 w-3.5" />
              Voiceover
            </TabsTrigger>
            <TabsTrigger value="captions" className="gap-1.5 text-xs">
              <Captions className="h-3.5 w-3.5" />
              Captions
            </TabsTrigger>
            <TabsTrigger value="music" className="gap-1.5 text-xs">
              <Music className="h-3.5 w-3.5" />
              Music
            </TabsTrigger>
            <TabsTrigger value="remix" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Remix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voiceover" className="mt-3">
            <AiVoiceoverStudio
              video={video}
              videoElement={videoElement}
              creditsRemaining={creditsRemaining}
            />
          </TabsContent>

          <TabsContent value="captions" className="mt-3">
            <EnhancedCaptionEditor
              video={video}
              videoElement={videoElement}
            />
          </TabsContent>

          <TabsContent value="music" className="mt-3">
            <div className="rounded-lg border p-4">
              <BackgroundMusicMixer videoElement={videoElement} />
            </div>
          </TabsContent>

          <TabsContent value="remix" className="mt-3">
            <VideoRemixStudio
              completedVideos={[video]}
              planId={planId}
              videosThisMonth={videosThisMonth}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
