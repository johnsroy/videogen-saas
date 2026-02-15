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
import { ProductUpload } from './product-upload'
import { TemplateBrowser } from './template-browser'
import { TemplateCustomizer } from './template-customizer'
import { VideoCreatedToast } from './video-created-toast'
import { Clapperboard, Loader2, Sparkles, ArrowRight, ArrowLeft, Package, LayoutGrid, Settings2 } from 'lucide-react'
import type { VeoModel, VeoAspectRatio, VeoDuration, ShotTemplate, ProductInput } from '@/lib/veo-types'

interface ShotDesignerProps {
  stylePrefix: string
  audioEnabled: boolean
  audioDirection: string
  onVideoCreated: (video: Record<string, unknown>) => void
  creditsRemaining?: number
}

type WizardStep = 'product' | 'browse' | 'customize' | 'custom-shot'

const STEP_LABELS = [
  { key: 'product', label: 'Product', icon: Package },
  { key: 'browse', label: 'Templates', icon: LayoutGrid },
  { key: 'customize', label: 'Customize', icon: Settings2 },
] as const

export function ShotDesigner({
  stylePrefix,
  audioEnabled,
  audioDirection,
  onVideoCreated,
  creditsRemaining = 0,
}: ShotDesignerProps) {
  const [step, setStep] = useState<WizardStep>('product')
  const [product, setProduct] = useState<ProductInput | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ShotTemplate | null>(null)

  // Step indicator
  const activeStepIndex =
    step === 'product' ? 0 : step === 'browse' ? 1 : step === 'customize' ? 2 : -1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5" />
          Shot Designer
        </CardTitle>
        <CardDescription>
          Upload your product, choose a template, and generate a professional 4K video ad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step indicator (only for wizard flow, not custom shot) */}
        {step !== 'custom-shot' && (
          <div className="mb-6 flex items-center gap-2">
            {STEP_LABELS.map((s, i) => {
              const Icon = s.icon
              const isActive = i === activeStepIndex
              const isCompleted = i < activeStepIndex
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`h-px w-6 ${isCompleted || isActive ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                    />
                  )}
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Step content */}
        {step === 'product' && (
          <ProductUpload
            onProductChange={setProduct}
            onContinue={() => setStep('browse')}
          />
        )}

        {step === 'browse' && (
          <TemplateBrowser
            onSelectTemplate={(template) => {
              setSelectedTemplate(template)
              setStep('customize')
            }}
            onCustomShot={() => setStep('custom-shot')}
            onBack={() => setStep('product')}
          />
        )}

        {step === 'customize' && selectedTemplate && product && (
          <TemplateCustomizer
            template={selectedTemplate}
            product={product}
            stylePrefix={stylePrefix}
            audioEnabled={audioEnabled}
            audioDirection={audioDirection}
            creditsRemaining={creditsRemaining}
            onVideoCreated={onVideoCreated}
            onBack={() => setStep('browse')}
          />
        )}

        {step === 'custom-shot' && (
          <LegacyShotDesigner
            stylePrefix={stylePrefix}
            audioEnabled={audioEnabled}
            audioDirection={audioDirection}
            onVideoCreated={onVideoCreated}
            onBack={() => setStep('browse')}
          />
        )}
      </CardContent>
    </Card>
  )
}

/* ── Legacy Custom Shot Designer (original implementation) ── */

function LegacyShotDesigner({
  stylePrefix,
  audioEnabled,
  audioDirection,
  onVideoCreated,
  onBack,
}: {
  stylePrefix: string
  audioEnabled: boolean
  audioDirection: string
  onVideoCreated: (video: Record<string, unknown>) => void
  onBack: () => void
}) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [startFrames, setStartFrames] = useState<UploadedImage[]>([])
  const [endFrames, setEndFrames] = useState<UploadedImage[]>([])
  const [aspectRatio, setAspectRatio] = useState<VeoAspectRatio>('16:9')
  const [duration, setDuration] = useState<VeoDuration>(8)
  const [model, setModel] = useState<VeoModel>('veo-3.1-fast-generate-preview')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastTitle, setToastTitle] = useState('')
  const [showToast, setShowToast] = useState(false)
  const dismissToast = useCallback(() => setShowToast(false), [])

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
      setToastTitle(title.trim())
      setShowToast(true)
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold">Custom Shot</h3>
          <p className="text-sm text-muted-foreground">
            Define start and end frames — AI creates the cinematic transition.
          </p>
        </div>
      </div>

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
      <VideoCreatedToast visible={showToast} title={toastTitle} onDismiss={dismissToast} />
    </div>
  )
}
