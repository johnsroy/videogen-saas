'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Video,
  Loader2,
  Sparkles,
  ChevronDown,
  Wand2,
  RefreshCw,
  Check,
  X,
  Bot,
  Zap,
  Coins,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VEO_ENHANCEMENT_LABELS } from '@/lib/ai-prompts'
import type { VeoModel, VeoAspectRatio, ExtendedDuration } from '@/lib/veo-types'

interface TextToVideoCreatorProps {
  stylePrefix: string
  negativePromptDefault: string
  audioEnabled: boolean
  audioDirection: string
  onVideoCreated: (video: Record<string, unknown>) => void
}

type JobStatus = {
  status: string
  total_segments: number
  completed_segments: number
  current_segment_label: string | null
  error_message: string | null
}

const DURATION_OPTIONS: { value: ExtendedDuration; label: string; segments: number }[] = [
  { value: 4, label: '4s', segments: 1 },
  { value: 6, label: '6s', segments: 1 },
  { value: 8, label: '8s', segments: 1 },
  { value: 15, label: '15s', segments: 2 },
  { value: 30, label: '30s', segments: 4 },
  { value: 60, label: '1 min', segments: 8 },
  { value: 120, label: '2 min', segments: 15 },
]

export function TextToVideoCreator({
  stylePrefix,
  negativePromptDefault,
  audioEnabled,
  audioDirection,
  onVideoCreated,
}: TextToVideoCreatorProps) {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<VeoAspectRatio>('16:9')
  const [duration, setDuration] = useState<ExtendedDuration>(8)
  const [model, setModel] = useState<VeoModel>('veo-3.1-fast-generate-preview')
  const [negativePrompt, setNegativePrompt] = useState(negativePromptDefault)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI prompt generation state
  const [showAiGenerator, setShowAiGenerator] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null)
  const [enhanceAction, setEnhanceAction] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [wasAiGenerated, setWasAiGenerated] = useState(false)

  // Extended duration progress state
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)

  const isExtended = duration > 8
  const selectedDuration = DURATION_OPTIONS.find((d) => d.value === duration)!
  const creditRate = model === 'veo-3.1-fast-generate-preview' ? 1 : 2
  const creditCost = duration * creditRate

  // Poll job status for extended generation
  const pollJob = useCallback(async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/veo/template-job/${jobId}`)
        const data = await res.json()
        setJobStatus(data)

        if (data.status === 'completed') {
          clearInterval(interval)
          setIsGenerating(false)
          setJobStatus(null)
          if (data.video) {
            onVideoCreated(data.video)
          }
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setIsGenerating(false)
          setJobStatus(null)
          setError(data.error_message || 'Generation failed')
        }
      } catch {
        // Keep polling on network errors
      }
    }, 10_000)

    return () => clearInterval(interval)
  }, [onVideoCreated])

  async function handleAiGenerate() {
    if (!aiTopic.trim()) return
    setIsAiGenerating(true)
    setAiError(null)

    try {
      const res = await fetch('/api/ai/generate-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          duration,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'Failed to generate prompt')
        return
      }
      setPrompt(data.prompt)
      setWasAiGenerated(true)
      setShowAiGenerator(false)
    } catch {
      setAiError('Failed to generate prompt')
    } finally {
      setIsAiGenerating(false)
    }
  }

  async function handleRegenerate() {
    if (!aiTopic.trim()) {
      const topicToUse = aiTopic.trim() || prompt.slice(0, 200)
      if (!topicToUse) return
      setAiTopic(topicToUse)
    }
    setIsAiGenerating(true)
    setAiError(null)

    try {
      const res = await fetch('/api/ai/generate-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim() || prompt.slice(0, 200),
          duration,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'Failed to regenerate prompt')
        return
      }
      setPrompt(data.prompt)
      setWasAiGenerated(true)
    } catch {
      setAiError('Failed to regenerate prompt')
    } finally {
      setIsAiGenerating(false)
    }
  }

  async function handleEnhance(action: string) {
    if (!prompt.trim()) return
    setIsEnhancing(true)
    setEnhanceAction(action)
    setAiError(null)
    setEnhancedPrompt(null)

    try {
      const res = await fetch('/api/ai/enhance-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style: action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'Failed to enhance prompt')
        return
      }
      setEnhancedPrompt(data.enhanced_prompt)
    } catch {
      setAiError('Failed to enhance prompt')
    } finally {
      setIsEnhancing(false)
    }
  }

  function acceptEnhancement() {
    if (enhancedPrompt) {
      setPrompt(enhancedPrompt)
      setEnhancedPrompt(null)
      setEnhanceAction(null)
    }
  }

  function rejectEnhancement() {
    setEnhancedPrompt(null)
    setEnhanceAction(null)
  }

  async function handleGenerate() {
    if (!title.trim() || !prompt.trim()) return
    setIsGenerating(true)
    setError(null)
    setJobStatus(null)

    try {
      const fullPrompt = stylePrefix ? `${stylePrefix}${prompt.trim()}` : prompt.trim()
      const fullNegative = negativePrompt.trim() || undefined

      const finalPrompt = audioEnabled && audioDirection
        ? `${fullPrompt}. Audio: ${audioDirection}`
        : fullPrompt

      // Use extended route for durations > 8s, standard route for <=8s
      const endpoint = isExtended ? '/api/veo/generate-extended' : '/api/veo/generate'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          prompt: finalPrompt,
          aspectRatio,
          duration,
          model,
          generateAudio: audioEnabled,
          negativePrompt: fullNegative,
          mode: 'ugc',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate video')
        setIsGenerating(false)
        return
      }

      if (data.job?.id) {
        // Extended generation — poll for progress
        pollJob(data.job.id)
      } else if (data.video) {
        // Standard short generation — immediate response
        setIsGenerating(false)
        onVideoCreated(data.video)
        setTitle('')
        setPrompt('')
        setWasAiGenerated(false)
        setAiTopic('')
      }
    } catch {
      setError('Failed to generate video')
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Text to Video
        </CardTitle>
        <CardDescription>
          Describe your video and let Google Veo 3.1 bring it to life. Use AI to craft the perfect prompt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My AI Video"
            disabled={isGenerating}
          />
        </div>

        {/* AI Prompt Tools */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAiGenerator(!showAiGenerator)}
              disabled={isAiGenerating || isEnhancing || isGenerating}
            >
              <Bot className="mr-1.5 h-3.5 w-3.5" />
              AI Generate
            </Button>

            {wasAiGenerated && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isAiGenerating || isEnhancing || isGenerating}
              >
                {isAiGenerating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Re-generate
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!prompt.trim() || isAiGenerating || isEnhancing || isGenerating}
                >
                  {isEnhancing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Enhance
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {Object.entries(VEO_ENHANCEMENT_LABELS).map(([key, label]) => (
                  <DropdownMenuItem key={key} onClick={() => handleEnhance(key)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* AI Topic Input */}
          {showAiGenerator && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Describe your video idea</Label>
                <Textarea
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="A drone flyover of a tropical island at sunset with crystal clear water..."
                  maxLength={1000}
                  rows={2}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAiGenerate()
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  AI will expand this into a detailed cinematic prompt with camera movements, lighting, and atmosphere.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiGenerate}
                  disabled={!aiTopic.trim() || isAiGenerating}
                >
                  {isAiGenerating ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isAiGenerating ? 'Writing prompt...' : 'Generate Prompt'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAiGenerator(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Enhancement Preview */}
          {enhancedPrompt && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {enhanceAction && VEO_ENHANCEMENT_LABELS[enhanceAction]} — Preview:
                </p>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={acceptEnhancement}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Accept
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={rejectEnhancement}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {enhancedPrompt}
              </p>
            </div>
          )}

          {aiError && (
            <p className="text-xs text-destructive">{aiError}</p>
          )}
        </div>

        {/* Main Prompt Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Prompt</Label>
            <div className="flex items-center gap-2">
              {wasAiGenerated && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Bot className="h-3 w-3" />
                  AI Generated
                </span>
              )}
              <span className="text-xs text-muted-foreground">{prompt.length}/5000</span>
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
            }}
            maxLength={5000}
            rows={8}
            className="leading-relaxed"
            disabled={isGenerating}
            placeholder="A person walking through a sunlit park, birds flying overhead, warm golden hour lighting...

Or use AI Generate above to create a detailed cinematic prompt from just a brief idea."
          />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as VeoAspectRatio)} disabled={isGenerating}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
            <Select
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v) as ExtendedDuration)}
              disabled={isGenerating}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4" className="text-xs">4 seconds</SelectItem>
                <SelectItem value="6" className="text-xs">6 seconds</SelectItem>
                <SelectItem value="8" className="text-xs">8 seconds</SelectItem>
                <SelectItem value="15" className="text-xs">15 seconds</SelectItem>
                <SelectItem value="30" className="text-xs">30 seconds</SelectItem>
                <SelectItem value="60" className="text-xs">1 minute</SelectItem>
                <SelectItem value="120" className="text-xs">2 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quality</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModel('veo-3.1-fast-generate-preview')}
                disabled={isGenerating}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all',
                  model === 'veo-3.1-fast-generate-preview'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-muted-foreground/40'
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Draft
                </span>
                <span className="text-[10px] text-muted-foreground">~30 seconds</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('veo-3.1-generate-preview')}
                disabled={isGenerating}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all',
                  model === 'veo-3.1-generate-preview'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-muted-foreground/40'
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  Standard 4K
                </span>
                <span className="text-[10px] text-muted-foreground">~5-10 min, highest quality</span>
              </button>
            </div>
          </div>
        </div>

        {/* Extended duration info */}
        {isExtended && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium">Multi-segment generation</p>
              <p>
                This video will be generated as {selectedDuration.segments} parallel clips and composed into a single video.
                {duration >= 60 && ' You can leave this page — check My Videos for progress.'}
              </p>
            </div>
          </div>
        )}

        {/* Credit cost */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{creditCost} credits</p>
              {isExtended && (
                <p className="text-[10px] text-muted-foreground">
                  {selectedDuration.segments} clips × {creditRate}/sec
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar for extended generation */}
        {isGenerating && jobStatus && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {jobStatus.status === 'generating'
                  ? `Generating clip ${jobStatus.completed_segments}/${jobStatus.total_segments}`
                  : jobStatus.status === 'composing'
                    ? 'Composing final video...'
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
          </div>
        )}

        {/* Advanced options */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={isGenerating}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Negative Prompt</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                rows={2}
                className="text-xs"
                placeholder="Things to avoid in the video..."
                disabled={isGenerating}
              />
            </div>
          </div>
        )}

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
              {isExtended
                ? (jobStatus ? 'Generating Multi-Clip Video...' : 'Starting Generation...')
                : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Video ({creditCost} credits)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
