'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Monitor,
  Coins,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
} from 'lucide-react'
import { hydratePrompt, calculateTemplateCreditCost, DURATION_TIER_LABELS } from '@/lib/shot-templates'
import { VideoCreatedToast } from './video-created-toast'
import type { ShotTemplate, ProductInput, VeoAspectRatio, VeoDuration } from '@/lib/veo-types'

interface TemplateCustomizerProps {
  template: ShotTemplate
  product: ProductInput
  stylePrefix: string
  audioEnabled: boolean
  audioDirection: string
  creditsRemaining: number
  onVideoCreated: (video: Record<string, unknown>) => void
  onBack: () => void
}

type JobStatus = {
  status: string
  total_segments: number
  completed_segments: number
  current_segment_label: string | null
  error_message: string | null
}

export function TemplateCustomizer({
  template,
  product,
  stylePrefix,
  audioEnabled,
  audioDirection,
  creditsRemaining,
  onVideoCreated,
  onBack,
}: TemplateCustomizerProps) {
  const [aspectRatio, setAspectRatio] = useState<VeoAspectRatio>(template.suggestedAspectRatio)
  const [duration, setDuration] = useState<VeoDuration>(template.suggestedDuration)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedStoryboard, setExpandedStoryboard] = useState(false)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [showToast, setShowToast] = useState(false)
  const dismissToast = useCallback(() => setShowToast(false), [])

  // Hydrate the main prompt
  const [mainPrompt, setMainPrompt] = useState(() =>
    hydratePrompt(template.promptTemplate, product.name, product.description)
  )

  // Hydrate segment prompts for multi-segment templates
  const [segmentPrompts, setSegmentPrompts] = useState<string[]>(() =>
    template.segments?.map((seg) =>
      hydratePrompt(seg.promptTemplate, product.name, product.description)
    ) ?? []
  )

  const isMultiSegment = template.durationTier === 'medium' || template.durationTier === 'long' || template.durationTier === 'xlarge'
  const isAsync = template.durationTier === 'xlarge'

  // For short templates, use user-chosen duration. For multi-segment, use template total.
  const effectiveDuration = isMultiSegment ? template.totalDurationSeconds : duration
  const creditCost = calculateTemplateCreditCost(template, effectiveDuration)
  const hasEnoughCredits = creditsRemaining >= creditCost

  // Poll job status for multi-segment generation
  const pollJob = useCallback(async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/veo/template-job/${jobId}`)
        const data = await res.json()
        setJobStatus(data)

        if (data.status === 'completed') {
          clearInterval(interval)
          setIsGenerating(false)
          if (data.video) {
            onVideoCreated(data.video)
            setShowToast(true)
          }
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setIsGenerating(false)
          setError(data.error_message || 'Generation failed')
        }
      } catch {
        // Keep polling on network errors
      }
    }, 10_000)

    return () => clearInterval(interval)
  }, [onVideoCreated])

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    setJobStatus(null)

    try {
      if (isMultiSegment && template.segments) {
        // Multi-segment generation
        const segments = template.segments.map((seg, i) => {
          let prompt = segmentPrompts[i] || hydratePrompt(seg.promptTemplate, product.name, product.description)
          if (stylePrefix) prompt = `${stylePrefix}${prompt}`
          if (audioEnabled && audioDirection) prompt = `${prompt}. Audio: ${audioDirection}`
          if (seg.cameraMovement) prompt = `${prompt}. Camera: ${seg.cameraMovement}`

          return {
            promptTemplate: prompt,
            duration: seg.duration,
            imageMode: seg.imageMode,
            label: seg.label,
          }
        })

        const res = await fetch('/api/veo/multi-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${template.name} - ${product.name}`,
            templateId: template.id,
            segments,
            aspectRatio,
            generateAudio: audioEnabled,
            model: 'veo-3.1-generate-preview',
            productImages: product.images.slice(0, 3).map((img) => ({
              base64: img.base64,
              mimeType: img.mimeType,
            })),
            style: template.category,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to generate video')
          setIsGenerating(false)
          return
        }

        if (data.job?.id) {
          // Poll for progress (async generation)
          pollJob(data.job.id)
        } else if (data.video) {
          // Completed synchronously
          setIsGenerating(false)
          onVideoCreated(data.video)
          setShowToast(true)
        }
      } else {
        // Single-segment (short) generation
        let prompt = mainPrompt
        if (stylePrefix) prompt = `${stylePrefix}${prompt}`
        if (audioEnabled && audioDirection) prompt = `${prompt}. Audio: ${audioDirection}`
        if (template.cameraMovement) prompt = `${prompt}. Camera: ${template.cameraMovement}`

        const imageMode = template.imageMode
        const imageParams: Record<string, unknown> = {}
        if (product.images.length > 0) {
          if (imageMode === 'start_frame') {
            imageParams.startFrame = {
              base64: product.images[0].base64,
              mimeType: product.images[0].mimeType,
            }
          } else {
            imageParams.referenceImages = product.images.slice(0, 3).map((img) => ({
              base64: img.base64,
              mimeType: img.mimeType,
            }))
          }
        }

        const res = await fetch('/api/veo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${template.name} - ${product.name}`,
            prompt,
            ...imageParams,
            aspectRatio,
            duration,
            model: 'veo-3.1-generate-preview',
            generateAudio: audioEnabled,
            mode: 'template',
            style: template.category,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to generate video')
          setIsGenerating(false)
          return
        }

        setIsGenerating(false)
        onVideoCreated(data.video)
        setShowToast(true)
      }
    } catch {
      setError('Failed to generate video')
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8" disabled={isGenerating}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{template.name}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {DURATION_TIER_LABELS[template.durationTier].label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {template.totalDurationSeconds}s
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              <Monitor className="mr-0.5 h-2.5 w-2.5" />
              4K Ultra HD
            </Badge>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{template.description}</p>

      {/* Async info banner for XLarge */}
      {isAsync && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium">Long-form video</p>
            <p>Generation will run in the background. You can leave this page and check progress in My Videos.</p>
          </div>
        </div>
      )}

      {/* Prompt editor */}
      {!isMultiSegment ? (
        <div className="space-y-2">
          <Label>Video Prompt</Label>
          <Textarea
            value={mainPrompt}
            onChange={(e) => setMainPrompt(e.target.value)}
            rows={4}
            maxLength={5000}
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            Auto-generated from template. Edit to customize.
          </p>
        </div>
      ) : (
        /* Storyboard view for multi-segment */
        <div className="space-y-2">
          <button
            onClick={() => setExpandedStoryboard(!expandedStoryboard)}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span>Storyboard ({template.segments?.length} segments)</span>
            {expandedStoryboard ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandedStoryboard && template.segments && (
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border p-3">
              {template.segments.map((seg, i) => (
                <div key={i} className="space-y-1.5 rounded-md bg-muted/30 p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {i + 1}
                      </Badge>
                      <span className="text-xs font-medium">{seg.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{seg.duration}s</span>
                  </div>
                  <Textarea
                    value={segmentPrompts[i]}
                    onChange={(e) => {
                      const updated = [...segmentPrompts]
                      updated[i] = e.target.value
                      setSegmentPrompts(updated)
                    }}
                    rows={2}
                    className="text-xs"
                    maxLength={5000}
                    disabled={isGenerating}
                  />
                </div>
              ))}
            </div>
          )}

          {!expandedStoryboard && template.segments && (
            <div className="flex flex-wrap gap-1.5">
              {template.segments.map((seg, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {seg.label} ({seg.duration}s)
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Aspect Ratio</Label>
          <Select
            value={aspectRatio}
            onValueChange={(v) => setAspectRatio(v as VeoAspectRatio)}
            disabled={isGenerating}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">Landscape (16:9)</SelectItem>
              <SelectItem value="9:16">Portrait (9:16)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isMultiSegment ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
            <div className="flex gap-1">
              {([4, 6, 8] as VeoDuration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setDuration(d)}
                  className={`flex h-8 flex-1 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                    duration === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
            <div className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-xs">
              <Clock className="mr-1.5 h-3 w-3" />
              {template.totalDurationSeconds >= 60
                ? `${Math.floor(template.totalDurationSeconds / 60)}m ${template.totalDurationSeconds % 60 > 0 ? `${template.totalDurationSeconds % 60}s` : ''}`
                : `${template.totalDurationSeconds}s`}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Quality</Label>
          <div className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-xs">
            <Monitor className="mr-1.5 h-3 w-3" />
            Standard 4K
          </div>
        </div>
      </div>

      {/* Credit cost */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{creditCost} credits</p>
            {isMultiSegment && (
              <p className="text-[10px] text-muted-foreground">
                {template.segments?.length} segments × Standard rate
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${hasEnoughCredits ? 'text-green-600' : 'text-destructive'}`}>
            {creditsRemaining} available
          </p>
        </div>
      </div>

      {!hasEnoughCredits && (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Insufficient credits. Need {creditCost}, have {creditsRemaining}. Purchase more credits.
        </div>
      )}

      {/* Progress bar for multi-segment */}
      {isGenerating && jobStatus && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {jobStatus.status === 'generating'
                ? `Generating segment ${jobStatus.completed_segments}/${jobStatus.total_segments}`
                : jobStatus.status === 'composing'
                  ? 'Composing final video (4K upscale)...'
                  : jobStatus.status === 'uploading'
                    ? 'Uploading...'
                    : 'Processing...'}
            </span>
            {jobStatus.current_segment_label && (
              <span className="text-muted-foreground">{jobStatus.current_segment_label}</span>
            )}
          </div>
          <Progress
            value={
              jobStatus.status === 'composing'
                ? 90
                : jobStatus.status === 'uploading'
                  ? 95
                  : (jobStatus.completed_segments / jobStatus.total_segments) * 85
            }
          />
          {isAsync && (
            <p className="text-[10px] text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              You can leave this page. Check My Videos for progress.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !hasEnoughCredits}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isMultiSegment ? 'Generating Video...' : 'Creating Ad...'}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate 4K Video ({creditCost} credits)
          </>
        )}
      </Button>
      <VideoCreatedToast visible={showToast} title={`${template.name} - ${product.name}`} onDismiss={dismissToast} />
    </div>
  )
}
