'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUploadZone, type UploadedImage } from './image-upload-zone'
import { VideoCreatedToast } from './video-created-toast'
import { Beaker, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

interface IngredientsStudioProps {
  stylePrefix: string
  audioEnabled: boolean
  audioDirection: string
  onVideoCreated: (video: Record<string, unknown>) => void
}

export function IngredientsStudio({
  stylePrefix,
  audioEnabled,
  audioDirection,
  onVideoCreated,
}: IngredientsStudioProps) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [aspectRatio, setAspectRatio] = useState<VeoAspectRatio>('16:9')
  const [duration, setDuration] = useState<VeoDuration>(8)
  const [model, setModel] = useState<VeoModel>('veo-3.1-fast-generate-preview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastTitle, setToastTitle] = useState('')
  const [showToast, setShowToast] = useState(false)
  const dismissToast = useCallback(() => setShowToast(false), [])

  async function handleGenerate() {
    if (!title.trim() || !prompt.trim() || images.length === 0) return
    setIsGenerating(true)
    setError(null)

    try {
      const fullPrompt = stylePrefix ? `${stylePrefix}${prompt.trim()}` : prompt.trim()
      const finalPrompt = audioEnabled && audioDirection
        ? `${fullPrompt}. Audio: ${audioDirection}`
        : fullPrompt

      const res = await fetch('/api/veo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          prompt: finalPrompt,
          referenceImages: images.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType,
            label: img.label || img.name,
          })),
          aspectRatio,
          duration,
          model,
          generateAudio: audioEnabled,
          mode: 'ingredients',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate video')
        return
      }
      onVideoCreated(data.video)
      setToastTitle(title.trim())
      setShowToast(true)
      setTitle('')
      setPrompt('')
      setImages([])
    } catch {
      setError('Failed to generate video')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="h-5 w-5" />
          Ingredients Studio
        </CardTitle>
        <CardDescription>
          Upload product photos, brand assets, or scene references. AI combines them into a video.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product Launch Video"
          />
        </div>

        {/* Ingredients upload */}
        <ImageUploadZone
          maxFiles={3}
          onImagesChange={setImages}
          label="Your Ingredients (up to 3 images)"
          description="Upload product photos, brand logos, scene references — AI will incorporate them into your video."
        />

        {/* Visual flow indicator */}
        {images.length > 0 && (
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="flex -space-x-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img.previewUrl}
                  alt=""
                  className="h-8 w-8 rounded-full border-2 border-background object-cover"
                />
              ))}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground animate-pulse" />
            <div className="flex h-8 items-center rounded-full bg-primary/10 px-3 text-xs font-medium text-primary">
              AI Video
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>How should AI combine them?</Label>
            <span className="text-xs text-muted-foreground">{prompt.length}/5000</span>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Show the product being used in a modern kitchen, with the brand logo appearing at the end..."
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as VeoAspectRatio)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">Landscape</SelectItem>
                <SelectItem value="9:16">Portrait</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
            <div className="flex gap-1">
              {([4, 6, 8] as VeoDuration[]).map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={duration === d ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => setDuration(d)}
                >
                  {d}s
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quality</Label>
            <Select value={model} onValueChange={(v) => setModel(v as VeoModel)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veo-3.1-generate-preview">Standard (higher quality)</SelectItem>
                <SelectItem value="veo-3.1-fast-generate-preview">Fast (recommended)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !title.trim() || !prompt.trim() || images.length === 0}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mixing Ingredients...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Video from Ingredients
            </>
          )}
        </Button>
      </CardContent>
      <VideoCreatedToast visible={showToast} title={toastTitle} onDismiss={dismissToast} />
    </Card>
  )
}
