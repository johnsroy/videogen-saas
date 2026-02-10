'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { VideoRecord } from '@/lib/heygen-types'

interface VideoPlayerDialogProps {
  video: VideoRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoPlayerDialog({ video, open, onOpenChange }: VideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{video.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {video.video_url ? (
            <video
              src={video.video_url}
              controls
              autoPlay
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
              <span>Created: {new Date(video.created_at).toLocaleDateString()}</span>
            </div>
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
      </DialogContent>
    </Dialog>
  )
}
