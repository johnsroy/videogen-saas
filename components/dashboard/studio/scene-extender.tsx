'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Maximize2, Loader2, Sparkles, Play } from 'lucide-react'
import type { VideoRecord } from '@/lib/heygen-types'

interface SceneExtenderProps {
  onVideoCreated: (video: Record<string, unknown>) => void
}

export function SceneExtender({ onVideoCreated }: SceneExtenderProps) {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [extendDuration, setExtendDuration] = useState(8)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedVideo = videos.find((v) => v.id === selectedVideoId) ?? null

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

  async function handleExtend() {
    if (!selectedVideoId || !prompt.trim()) return
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/veo/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          prompt: prompt.trim(),
          extendDurationSeconds: extendDuration,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to extend video')
        return
      }
      onVideoCreated(data.video)
      setPrompt('')
    } catch {
      setError('Failed to extend video')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Maximize2 className="h-5 w-5" />
          Scene Extender
        </CardTitle>
        <CardDescription>
          Select a completed Veo video and extend it with new content.
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
                      {v.title} ({v.duration ? `${v.duration}s` : 'unknown duration'})
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
                  <div className="flex h-6 overflow-hidden rounded-full">
                    <div
                      className="flex items-center justify-center bg-primary/80 text-[10px] font-medium text-primary-foreground"
                      style={{
                        width: `${selectedVideo.duration ? (selectedVideo.duration / (selectedVideo.duration + extendDuration)) * 100 : 50}%`,
                      }}
                    >
                      Original {selectedVideo.duration ? `${selectedVideo.duration}s` : ''}
                    </div>
                    <div className="flex flex-1 items-center justify-center bg-primary/30 text-[10px] font-medium text-primary animate-pulse">
                      +{extendDuration}s extension
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Total: ~{(selectedVideo.duration ?? 0) + extendDuration}s
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
              <div className="flex gap-2">
                {[4, 6, 8].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={extendDuration === d ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExtendDuration(d)}
                  >
                    +{d}s
                  </Button>
                ))}
              </div>
            </div>

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
                  Extending...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Extend Video
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
