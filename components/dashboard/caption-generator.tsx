'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Subtitles, Loader2, Download, Film } from 'lucide-react'
import type { VideoRecord } from '@/lib/heygen-types'

interface CaptionGeneratorProps {
  completedVideos: VideoRecord[]
}

export function CaptionGenerator({ completedVideos }: CaptionGeneratorProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [captionContent, setCaptionContent] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedVideo = completedVideos.find((v) => v.id === selectedVideoId)

  async function handleVideoSelect(videoId: string) {
    setSelectedVideoId(videoId)
    setCaptionContent(null)
    setError(null)

    // Fetch existing captions
    setIsLoading(true)
    try {
      const res = await fetch(`/api/captions/${videoId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.caption?.content) {
          setCaptionContent(data.caption.content)
        }
      }
    } catch {
      // No existing captions
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGenerate() {
    if (!selectedVideoId) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: selectedVideoId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate captions')
        return
      }
      setCaptionContent(data.caption.content)
    } catch {
      setError('Failed to generate captions')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleDownload() {
    if (!captionContent || !selectedVideo) return
    const blob = new Blob([captionContent], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `captions-${selectedVideo.title.replace(/\s+/g, '-').toLowerCase()}.vtt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (completedVideos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Subtitles className="h-5 w-5" />
            Caption Generator
          </CardTitle>
          <CardDescription>Generate captions and subtitles for your videos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Film className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No completed videos yet. Create a video first to generate captions.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Subtitles className="h-5 w-5" />
          Caption Generator
        </CardTitle>
        <CardDescription>Generate captions and subtitles for your videos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select a Video</Label>
          <Select value={selectedVideoId} onValueChange={handleVideoSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a completed video..." />
            </SelectTrigger>
            <SelectContent>
              {completedVideos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                  {video.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVideoId && !isLoading && (
          <div className="space-y-3">
            {/* Video preview */}
            {selectedVideo?.video_url && (
              <div className="overflow-hidden rounded-lg border">
                <video
                  src={selectedVideo.video_url}
                  controls
                  className="w-full"
                  style={{ maxHeight: 300 }}
                />
              </div>
            )}

            {!captionContent ? (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedVideo?.script}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Captions...
                  </>
                ) : (
                  <>
                    <Subtitles className="mr-2 h-4 w-4" />
                    Generate Captions
                  </>
                )}
              </Button>
            ) : (
              <>
                {/* Caption preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>WebVTT Preview</Label>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download .vtt
                    </Button>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-md border bg-muted/50 p-3 text-xs font-mono">
                    {captionContent}
                  </pre>
                </div>

                {/* Re-generate */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Subtitles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Regenerate
                </Button>
              </>
            )}

            {!selectedVideo?.script && (
              <p className="text-xs text-muted-foreground">
                This video has no script. Captions can only be generated for videos created with a script.
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
