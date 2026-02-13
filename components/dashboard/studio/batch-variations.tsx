'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Layers, Loader2, Sparkles, Plus, X, Play } from 'lucide-react'

interface Variation {
  id: string
  suffix: string
  status: 'pending' | 'generating' | 'done' | 'failed'
}

interface BatchVariationsProps {
  stylePrefix: string
  audioEnabled: boolean
  audioDirection: string
  onVideoCreated: (video: Record<string, unknown>) => void
}

export function BatchVariations({
  stylePrefix,
  audioEnabled,
  audioDirection,
  onVideoCreated,
}: BatchVariationsProps) {
  const [title, setTitle] = useState('')
  const [basePrompt, setBasePrompt] = useState('')
  const [variations, setVariations] = useState<Variation[]>([
    { id: '1', suffix: 'from a different angle', status: 'pending' },
    { id: '2', suffix: 'with dramatic lighting', status: 'pending' },
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  function addVariation() {
    if (variations.length >= 5) return
    setVariations([
      ...variations,
      { id: String(Date.now()), suffix: '', status: 'pending' },
    ])
  }

  function removeVariation(id: string) {
    setVariations(variations.filter((v) => v.id !== id))
  }

  function updateSuffix(id: string, suffix: string) {
    setVariations(variations.map((v) => (v.id === id ? { ...v, suffix } : v)))
  }

  async function handleGenerate() {
    if (!title.trim() || !basePrompt.trim() || variations.length === 0) return
    setIsGenerating(true)
    setError(null)
    setProgress(0)

    // Use draft mode for batch to save credits
    const model = 'veo-3.1-fast-generate-preview'

    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i]
      setVariations((prev) =>
        prev.map((v) => (v.id === variation.id ? { ...v, status: 'generating' } : v))
      )

      try {
        const varPrompt = variation.suffix.trim()
          ? `${stylePrefix}${basePrompt.trim()}, ${variation.suffix.trim()}`
          : `${stylePrefix}${basePrompt.trim()}`

        const finalPrompt = audioEnabled && audioDirection
          ? `${varPrompt}. Audio: ${audioDirection}`
          : varPrompt

        const res = await fetch('/api/veo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${title.trim()} (Var ${i + 1})`,
            prompt: finalPrompt,
            duration: 6,
            model,
            generateAudio: audioEnabled,
            mode: 'ugc',
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setVariations((prev) =>
            prev.map((v) => (v.id === variation.id ? { ...v, status: 'failed' } : v))
          )
          if (data.code === 'INSUFFICIENT_CREDITS') {
            setError(`Ran out of credits after ${i} variations.`)
            break
          }
          continue
        }
        setVariations((prev) =>
          prev.map((v) => (v.id === variation.id ? { ...v, status: 'done' } : v))
        )
        onVideoCreated(data.video)
      } catch {
        setVariations((prev) =>
          prev.map((v) => (v.id === variation.id ? { ...v, status: 'failed' } : v))
        )
      }
      setProgress(((i + 1) / variations.length) * 100)
    }

    setIsGenerating(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Batch Variations
        </CardTitle>
        <CardDescription>
          Generate multiple variations of the same concept using Draft mode for fast, cheap previews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product Ad Variations"
          />
        </div>

        <div className="space-y-2">
          <Label>Base Prompt</Label>
          <Textarea
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="A person holding a phone and smiling at the camera..."
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Variations ({variations.length}/5)</Label>
            {variations.length < 5 && (
              <Button type="button" variant="ghost" size="sm" onClick={addVariation}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {variations.map((v, i) => (
              <div key={v.id} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                  {i + 1}
                </span>
                <Input
                  value={v.suffix}
                  onChange={(e) => updateSuffix(v.id, e.target.value)}
                  placeholder="Variation modifier (e.g. 'close-up shot')"
                  className="h-8 text-xs"
                  disabled={isGenerating}
                />
                <div className="flex items-center gap-1">
                  {v.status === 'generating' && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                  {v.status === 'done' && (
                    <Play className="h-3.5 w-3.5 text-green-600" />
                  )}
                  {v.status === 'failed' && (
                    <X className="h-3.5 w-3.5 text-destructive" />
                  )}
                  {!isGenerating && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeVariation(v.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isGenerating && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {Math.round(progress)}% — Generating variations...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Batch uses Draft mode (1 credit/sec) for fast previews. Regenerate favorites in Standard from the gallery.
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !title.trim() || !basePrompt.trim() || variations.length === 0}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating {variations.length} Variations...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate {variations.length} Variations (Draft)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
