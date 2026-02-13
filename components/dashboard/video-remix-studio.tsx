'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AvatarPicker } from './avatar-picker'
import { VoicePicker } from './voice-picker'
import {
  Sparkles,
  Loader2,
  RefreshCw,
  PenLine,
  Palette,
  Clock,
  Coins,
  Check,
} from 'lucide-react'
import { canGenerateVideo, getVideoLimit, canUseVeo } from '@/lib/plan-utils'
import { TONE_OPTIONS } from '@/lib/ai-prompts'
import type { PlanId } from '@/lib/plans'
import type { VideoRecord } from '@/lib/heygen-types'

type RemixMode = 'script-rewrite' | 'style-variation' | 'duration-remix'

const REMIX_MODES: { id: RemixMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'script-rewrite', label: 'AI Script Rewrite', icon: <PenLine className="h-3.5 w-3.5" />, desc: 'Rewrite in a different tone' },
  { id: 'style-variation', label: 'Style Variation', icon: <Palette className="h-3.5 w-3.5" />, desc: 'Change visual style' },
  { id: 'duration-remix', label: 'Duration Remix', icon: <Clock className="h-3.5 w-3.5" />, desc: 'Shorter or longer version' },
]

const VEO_DURATIONS = [5, 8, 10, 15, 30]
const HEYGEN_DURATIONS = [15, 30, 60, 90, 120]

const VEO_ASPECT_RATIOS = [
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '1:1', label: 'Square (1:1)' },
]

const HEYGEN_DIMENSIONS = [
  { value: '1280x720', label: 'Landscape (16:9)' },
  { value: '720x1280', label: 'Portrait (9:16)' },
  { value: '720x720', label: 'Square (1:1)' },
]

interface VideoRemixStudioProps {
  video: VideoRecord
  planId: PlanId
  videosThisMonth: number
  creditsRemaining: number
}

export function VideoRemixStudio({
  video,
  planId,
  videosThisMonth,
  creditsRemaining,
}: VideoRemixStudioProps) {
  const [mode, setMode] = useState<RemixMode>('script-rewrite')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Script Rewrite state
  const [tone, setTone] = useState('professional')
  const [customInstructions, setCustomInstructions] = useState('')
  const [rewrittenScript, setRewrittenScript] = useState('')
  const [showRewritten, setShowRewritten] = useState(false)

  // Style Variation state
  const [avatarId, setAvatarId] = useState<string | null>(video.avatar_id || null)
  const [voiceId, setVoiceId] = useState<string | null>(video.voice_id || null)
  const [dimension, setDimension] = useState(video.dimension || '1280x720')
  const [aspectRatio, setAspectRatio] = useState('16:9')

  // Duration Remix state
  const [targetDuration, setTargetDuration] = useState(15)
  const [adjustedScript, setAdjustedScript] = useState('')

  const isVeo = video.provider === 'google_veo'
  const isHeygen = !isVeo
  const originalScript = video.script || video.prompt || ''
  const videoLimit = getVideoLimit(planId)
  const limitReached = !canGenerateVideo(planId, videosThisMonth)
  const hasVeoAccess = canUseVeo(planId)

  // Reset state when video changes
  useEffect(() => {
    setError(null)
    setSuccess(false)
    setRewrittenScript('')
    setShowRewritten(false)
    setAdjustedScript('')
    setAvatarId(video.avatar_id || null)
    setVoiceId(video.voice_id || null)
    setDimension(video.dimension || '1280x720')
  }, [video.id, video.avatar_id, video.voice_id, video.dimension])

  async function handleScriptRewrite() {
    if (!originalScript) return
    setIsRewriting(true)
    setError(null)
    setShowRewritten(false)

    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: originalScript,
          enhancement: tone,
          custom_instructions: customInstructions.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rewrite script')

      setRewrittenScript(data.enhanced_script || data.script)
      setShowRewritten(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rewrite script')
    } finally {
      setIsRewriting(false)
    }
  }

  async function handleDurationAdjust() {
    if (!originalScript) return
    setIsRewriting(true)
    setError(null)

    try {
      const wordCount = Math.round((targetDuration / 60) * 150)
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: originalScript,
          enhancement: 'custom',
          custom_instructions: `Rewrite this script to be approximately ${wordCount} words (for a ${targetDuration}-second video). Keep the same message and tone but adjust the length. If making shorter, keep only the most impactful parts. If making longer, add more detail and examples.`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to adjust script')

      setAdjustedScript(data.enhanced_script || data.script)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust script')
    } finally {
      setIsRewriting(false)
    }
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    setSuccess(false)

    try {
      let res: Response

      if (isVeo) {
        // Veo remix — use the rewritten/adjusted script as prompt
        const prompt =
          mode === 'script-rewrite' ? rewrittenScript :
          mode === 'duration-remix' ? (adjustedScript || originalScript) :
          originalScript

        res = await fetch('/api/veo/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            duration: mode === 'duration-remix' ? targetDuration : (video.duration || 8),
            aspectRatio: mode === 'style-variation' ? aspectRatio : '16:9',
            model: video.veo_model || 'veo-3.1-generate-preview',
          }),
        })
      } else {
        // HeyGen remix
        const script =
          mode === 'script-rewrite' ? rewrittenScript :
          mode === 'duration-remix' ? (adjustedScript || originalScript) :
          originalScript

        res = await fetch('/api/heygen/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'avatar',
            title: video.title + ' (Remix)',
            avatar_id: mode === 'style-variation' ? avatarId : video.avatar_id,
            voice_id: mode === 'style-variation' ? voiceId : video.voice_id,
            script,
            dimension: mode === 'style-variation' ? dimension : (video.dimension || '1280x720'),
          }),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate remix')

      window.dispatchEvent(new CustomEvent('video-created', { detail: data.video }))
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remix failed')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!originalScript && mode !== 'style-variation') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Remix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            This video has no script or prompt to remix. Try the Style Variation mode instead.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Smart Remix
          <Badge variant="secondary" className="text-[10px]">
            {isVeo ? 'Veo' : 'HeyGen'}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Create variations of this video with AI-powered remix tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-1.5">
          {REMIX_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setError(null); setSuccess(false) }}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all ${
                mode === m.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              {m.icon}
              <span className="text-[10px] font-medium">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Script Rewrite Mode */}
        {mode === 'script-rewrite' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tone</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(TONE_OPTIONS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTone(key)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                      tone === key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Custom Instructions <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
                placeholder='e.g. "Make it shorter", "Add humor", "Focus on benefits"'
                className="text-xs resize-none"
              />
            </div>
            <Button
              size="sm"
              onClick={handleScriptRewrite}
              disabled={isRewriting || !originalScript}
            >
              {isRewriting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <PenLine className="mr-1.5 h-3.5 w-3.5" />
                  Rewrite Script
                </>
              )}
            </Button>

            {showRewritten && rewrittenScript && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Rewritten Script</Label>
                <p className="text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {rewrittenScript}
                </p>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating || limitReached}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Generate with This Script
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Style Variation Mode */}
        {mode === 'style-variation' && (
          <div className="space-y-3">
            {isVeo ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEO_ASPECT_RATIOS.map((ar) => (
                      <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Aspect Ratio</Label>
                  <Select value={dimension} onValueChange={setDimension}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEYGEN_DIMENSIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
                <VoicePicker selected={voiceId} onSelect={setVoiceId} />
              </>
            )}

            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || limitReached || (isHeygen && (!avatarId || !voiceId))}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Palette className="mr-1.5 h-3.5 w-3.5" />
                  Generate Style Variation
                </>
              )}
            </Button>
          </div>
        )}

        {/* Duration Remix Mode */}
        {mode === 'duration-remix' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Duration</Label>
              <div className="flex flex-wrap gap-1">
                {(isVeo ? VEO_DURATIONS : HEYGEN_DURATIONS).map((d) => (
                  <button
                    key={d}
                    onClick={() => setTargetDuration(d)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                      targetDuration === d
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDurationAdjust}
              disabled={isRewriting || !originalScript}
            >
              {isRewriting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Adjusting...
                </>
              ) : (
                <>
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  Adjust Script to {targetDuration}s
                </>
              )}
            </Button>

            {adjustedScript && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Adjusted Script</Label>
                <p className="text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {adjustedScript}
                </p>
              </div>
            )}

            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || limitReached || (!adjustedScript && mode === 'duration-remix')}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Generate {targetDuration}s Version
                </>
              )}
            </Button>
          </div>
        )}

        {/* Status Messages */}
        {success && (
          <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5" />
            Remix started! Check the gallery for your new video.
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {limitReached && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Video limit reached ({videoLimit}/month). Upgrade for more.
          </p>
        )}

        {/* Credits */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Coins className="h-3 w-3" />
          {isVeo ? `Uses AI Video credits (${creditsRemaining} remaining)` : `Free under plan limits`}
        </div>
      </CardContent>
    </Card>
  )
}
