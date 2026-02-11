'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Subtitles, Download, Loader2 } from 'lucide-react'

interface CaptionOverlayProps {
  videoId: string
  hasScript: boolean
}

export function CaptionOverlay({ videoId, hasScript }: CaptionOverlayProps) {
  const [captionContent, setCaptionContent] = useState<string | null>(null)
  const [showCaptions, setShowCaptions] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch existing captions on mount
  useEffect(() => {
    async function fetchCaptions() {
      try {
        const res = await fetch(`/api/captions/${videoId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.caption?.content) {
            setCaptionContent(data.caption.content)
          }
        }
      } catch {
        // No captions yet, that's fine
      } finally {
        setIsLoading(false)
      }
    }
    fetchCaptions()
  }, [videoId])

  const generateCaptions = useCallback(async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate captions')
        return
      }
      setCaptionContent(data.caption.content)
      setShowCaptions(true)
    } catch {
      setError('Failed to generate captions')
    } finally {
      setIsGenerating(false)
    }
  }, [videoId])

  function downloadVTT() {
    if (!captionContent) return
    const blob = new Blob([captionContent], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `captions-${videoId}.vtt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Provide the track URL for the video element
  const trackUrl = captionContent
    ? URL.createObjectURL(new Blob([captionContent], { type: 'text/vtt' }))
    : null

  if (isLoading) return null

  if (!hasScript) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Subtitles className="h-4 w-4 text-muted-foreground" />
        {!captionContent ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateCaptions}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Captions'
            )}
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Switch
                checked={showCaptions}
                onCheckedChange={setShowCaptions}
                aria-label="Toggle captions"
              />
              <span className="text-xs text-muted-foreground">
                {showCaptions ? 'Captions on' : 'Captions off'}
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={downloadVTT}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              .vtt
            </Button>
          </>
        )}
      </div>

      {/* Render track element data for parent to use */}
      {showCaptions && trackUrl && (
        <div data-caption-track-url={trackUrl} className="hidden" />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
