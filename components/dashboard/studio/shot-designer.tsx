'use client'

import { useState } from 'react'
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
import { Clapperboard, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import type { VeoModel, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

interface ShotDesignerProps {
  stylePrefix: string
  audioEnabled: boolean
  audioDirection: string
  onVideoCreated: (video: Record<string, unknown>) => void
}

export function ShotDesigner({
  stylePrefix,
  audioEnabled,
  audioDirection,
  onVideoCreated,
}: ShotDesignerProps) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [startFrames, setStartFrames] = useState<UploadedImage[]>([])
  const [endFrames, setEndFrames] = useState<UploadedImage[]>([])
  const [aspectRatio, setAspectRatio] = useState<VeoAspectRatio>('16:9')
  const [duration, setDuration] = useState<VeoDuration>(8)
  const [model, setModel] = useState<VeoModel>('veo-3.1-fast-generate-preview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startFrame = startFrames[0] ?? null
  const endFrame = endFrames[0] ?? null

  async function handleGenerate() {
    if (!title.trim() || !prompt.trim()) return
    setIsGenerating(true)
    setError(null)

    try {
      const basePrompt = stylePrefix ? `${stylePrefix}${prompt.trim()}` : prompt.trim()
      const finalPrompt = audioEnabled && audioDirection
        ? `${basePrompt}. Audio: ${audioDirection}`
        : basePrompt

      const res = await fetch('/api/veo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          prompt: finalPrompt,
          startFrame: startFrame
            ? { base64: startFrame.base64, mimeType: startFrame.mimeType }
            : undefined,
          endFrame: endFrame
            ? { base64: endFrame.base64, mimeType: endFrame.mimeType }
            : undefined,
          aspectRatio,
          duration,
          model,
          generateAudio: audioEnabled,
          mode: 'shot_design',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate video')
        return
      }
      onVideoCreated(data.video)
      setTitle('')
      setPrompt('')
      setStartFrames([])
      setEndFrames([])
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
          <Clapperboard className="h-5 w-5" />
          Shot Designer
        </CardTitle>
        <CardDescription>
          Define the start and end frames — AI creates the cinematic transition between them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Epic Product Reveal"
          />
        </div>

        {/* Side-by-side frame upload */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ImageUploadZone
              maxFiles={1}
              onImagesChange={setStartFrames}
              label="Start Frame"
              description="How the shot begins"
            />
          </div>
          <div>
            <ImageUploadZone
              maxFiles={1}
              onImagesChange={setEndFrames}
              label="End Frame"
              description="How the shot ends"
            />
          </div>
        </div>

        {/* Visual preview */}
        {(startFrame || endFrame) && (
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="flex flex-col items-center gap-1">
              {startFrame ? (
                <img
                  src={startFrame.previewUrl}
                  alt="Start"
                  className="h-16 w-24 rounded border object-cover"
                />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded border-2 border-dashed text-xs text-muted-foreground">
                  Start
                </div>
              )}
              <span className="text-[10px] text-muted-foreground">0s</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowRight className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-[10px] text-primary font-medium">AI fills in</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {endFrame ? (
                <img
                  src={endFrame.previewUrl}
                  alt="End"
                  className="h-16 w-24 rounded border object-cover"
                />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded border-2 border-dashed text-xs text-muted-foreground">
                  End
                </div>
              )}
              <span className="text-[10px] text-muted-foreground">{duration}s</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Describe the transition</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Camera slowly dollies forward, revealing the product as the background transitions from dawn to sunset..."
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
          disabled={isGenerating || !title.trim() || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Designing Shot...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Cinematic Shot
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
