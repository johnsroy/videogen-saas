'use client'

import { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { CaptionOverlay } from './caption-overlay'
import { RemixButton } from './remix-button'
import { BackgroundMusicMixer } from './background-music-mixer'
import { ShareButton } from './analytics/share-button'
import type { VideoRecord } from '@/lib/heygen-types'

interface VideoPlayerDialogProps {
  video: VideoRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoPlayerDialog({ video, open, onOpenChange }: VideoPlayerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{video.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {video.video_url ? (
            <video
              ref={videoRef}
              src={video.video_url}
              controls
              autoPlay
              crossOrigin="anonymous"
              className="w-full rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
              <p className="text-muted-foreground">Video not available</p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="space-x-4">
              <span>Mode: {video.mode}</span>
              {video.duration && <span>Duration: {Math.round(video.duration)}s</span>}
              <span>Created: {new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton videoId={video.id} videoStatus={video.status} />
              <RemixButton video={video} onClose={() => onOpenChange(false)} />
              {video.video_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={video.video_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Smart Editing Tools */}
          <div className="space-y-3 border-t pt-3">
            <CaptionOverlay
              videoId={video.id}
              hasScript={!!(video.script || video.prompt)}
            />
            <BackgroundMusicMixer videoElement={videoRef.current} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
