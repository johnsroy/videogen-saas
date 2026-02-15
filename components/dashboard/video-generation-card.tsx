'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AvatarPicker } from './avatar-picker'
import { VoicePicker } from './voice-picker'
import { ScriptAiTools } from './script-ai-tools'
import { Video, Wand2, Loader2, Sparkles, Zap, Coins, Lock, ArrowUpRight, Volume2, BrainCircuit, ChevronDown } from 'lucide-react'
import { canGenerateVideo, getVideoLimit, canUseVeo } from '@/lib/plan-utils'
import { VEO_ENHANCEMENT_LABELS } from '@/lib/ai-prompts'
import { UpgradeModal } from './upgrade-modal'
import { cn } from '@/lib/utils'
import type { PlanId } from '@/lib/plans'
import type { VideoRecord } from '@/lib/heygen-types'
import type { VeoModel, VeoAspectRatio, ExtendedDuration } from '@/lib/veo-types'
import Link from 'next/link'

interface VideoGenerationCardProps {
  planId: PlanId
  videosThisMonth: number
  aiUsageThisMonth: number
  creditsRemaining?: number
}

export function VideoGenerationCard({ planId, videosThisMonth, aiUsageThisMonth, creditsRemaining = 0 }: VideoGenerationCardProps) {
  const [mode, setMode] = useState<'avatar' | 'veo'>('avatar')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [dimension, setDimension] = useState('1280x720')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Veo tab state
  const [veoPrompt, setVeoPrompt] = useState('')
  const [veoTitle, setVeoTitle] = useState('')
  const [veoAspectRatio, setVeoAspectRatio] = useState<VeoAspectRatio>('16:9')
  const [veoDuration, setVeoDuration] = useState<ExtendedDuration>(8)
  const [veoModel, setVeoModel] = useState<VeoModel>('veo-3.1-fast-generate-preview')
  const [veoAudio, setVeoAudio] = useState(false)
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false)
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)

  const hasVeoAccess = canUseVeo(planId)
  const veoCreditCost = veoDuration * (veoModel === 'veo-3.1-fast-generate-preview' ? 1 : 2)
  const isVeoExtended = veoDuration > 8
  const hasEnoughCredits = creditsRemaining >= veoCreditCost

  // Check for prefilled script from Smart Editing "Use in Video"
  useEffect(() => {
    const prefill = sessionStorage.getItem('prefill-script')
    if (prefill) {
      sessionStorage.removeItem('prefill-script')
      setMode('avatar')
      setScript(prefill)
    }
  }, [])

  // Listen for remix events from the video player dialog
  useEffect(() => {
    function handleRemix(e: Event) {
      const video = (e as CustomEvent<VideoRecord>).detail
      setTitle(video.title + ' (Remix)')
      if (video.script) {
        setMode('avatar')
        setScript(video.script)
      } else if (video.prompt) {
        // No prompt tab anymore — use veo tab for prompt-based remixes
        setMode('veo')
        setVeoTitle(video.title + ' (Remix)')
        setVeoPrompt(video.prompt)
      }
      if (video.avatar_id) setSelectedAvatar(video.avatar_id)
      if (video.voice_id) setSelectedVoice(video.voice_id)
      if (video.dimension) setDimension(video.dimension)
      // Scroll to the generation card
      document.getElementById('video-generation-card')?.scrollIntoView({ behavior: 'smooth' })
    }
    window.addEventListener('video-remix', handleRemix)
    return () => window.removeEventListener('video-remix', handleRemix)
  }, [])

  const videoLimit = getVideoLimit(planId)
  const limitReached = !canGenerateVideo(planId, videosThisMonth)

  const canGenerate =
    !isGenerating &&
    !limitReached &&
    title.trim().length > 0 &&
    selectedAvatar && selectedVoice && script.trim().length > 0

  const canGenerateVeo =
    !isGenerating &&
    hasVeoAccess &&
    hasEnoughCredits &&
    veoTitle.trim().length > 0 &&
    veoPrompt.trim().length > 0

  async function handleGenerateVeoPrompt() {
    if (!veoTitle.trim()) return
    setIsGeneratingPrompt(true)
    try {
      const res = await fetch('/api/ai/generate-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: veoTitle.trim(), duration: veoDuration }),
      })
      const data = await res.json()
      if (res.ok && data.prompt) {
        setVeoPrompt(data.prompt)
      }
    } catch { /* ignore */ } finally {
      setIsGeneratingPrompt(false)
    }
  }

  async function handleEnhanceVeoPrompt(style: string) {
    if (!veoPrompt.trim()) return
    setIsEnhancingPrompt(true)
    try {
      const res = await fetch('/api/ai/enhance-veo-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: veoPrompt.trim(), style }),
      })
      const data = await res.json()
      if (res.ok && data.enhanced_prompt) {
        setVeoPrompt(data.enhanced_prompt)
      }
    } catch { /* ignore */ } finally {
      setIsEnhancingPrompt(false)
    }
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/heygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'avatar', title, avatar_id: selectedAvatar, voice_id: selectedVoice, script, dimension }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate video')
        return
      }
      // Notify gallery of new video
      window.dispatchEvent(new CustomEvent('video-created', { detail: data.video }))
      // Reset form
      setTitle('')
      setScript('')
    } catch {
      setError('Failed to generate video')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleVeoGenerate() {
    if (!canGenerateVeo) return
    setIsGenerating(true)
    setError(null)

    try {
      const finalPrompt = veoPrompt.trim()

      const endpoint = isVeoExtended ? '/api/veo/generate-extended' : '/api/veo/generate'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: veoTitle.trim(),
          prompt: finalPrompt,
          aspectRatio: veoAspectRatio,
          duration: veoDuration,
          model: veoModel,
          generateAudio: veoAudio,
          mode: 'ugc',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate video')
        return
      }
      window.dispatchEvent(new CustomEvent('video-created', { detail: data.video }))
      setVeoTitle('')
      setVeoPrompt('')
    } catch {
      setError('Failed to generate video')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card id="video-generation-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Generate Video
        </CardTitle>
        <CardDescription>
          {videoLimit === null
            ? 'Unlimited videos'
            : `${videosThisMonth} / ${videoLimit} videos used this month`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="avatar" onValueChange={(v) => setMode(v as 'avatar' | 'veo')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatar" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Avatar
            </TabsTrigger>
            <TabsTrigger value="veo" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Video
              {!hasVeoAccess && <Lock className="h-3 w-3 ml-0.5" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avatar" className="mt-4 space-y-4">
            <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            <VoicePicker selected={selectedVoice} onSelect={setSelectedVoice} />

            <div className="space-y-2">
              <Label htmlFor="avatar-title">Title</Label>
              <Input
                id="avatar-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Video"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="avatar-script">Script</Label>
                <span className="text-xs text-muted-foreground">{script.length}/5000</span>
              </div>
              <Textarea
                id="avatar-script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Type what the avatar should say..."
              />
              <ScriptAiTools
                currentScript={script}
                onScriptChange={setScript}
                planId={planId}
                aiUsageThisMonth={aiUsageThisMonth}
              />
            </div>

            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={dimension} onValueChange={setDimension}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1280x720">Landscape (16:9)</SelectItem>
                  <SelectItem value="720x1280">Portrait (9:16)</SelectItem>
                  <SelectItem value="720x720">Square (1:1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Veo 3 AI Video Tab */}
          <TabsContent value="veo" className="mt-4 space-y-4">
            {!hasVeoAccess ? (
              /* Upgrade prompt for Free/Starter users */
              <div className="flex flex-col items-center gap-4 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Video Generation</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate stunning videos with Google Veo 3.1 — text to video, 4K quality, audio generation.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <Badge variant="secondary">Text to Video</Badge>
                  <Badge variant="secondary">4K Resolution</Badge>
                  <Badge variant="secondary">AI Audio</Badge>
                  <Badge variant="secondary">Draft & Standard</Badge>
                </div>
                <Button asChild size="sm">
                  <Link href="/#pricing">
                    Upgrade to Creator
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <p className="text-[10px] text-muted-foreground">Requires Creator plan ($60/mo) or higher</p>
              </div>
            ) : (
              /* Full Veo 3 generation UI */
              <>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={veoTitle}
                    onChange={(e) => setVeoTitle(e.target.value)}
                    placeholder="My AI Video"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Describe your video</Label>
                    <span className="text-xs text-muted-foreground">{veoPrompt.length}/5000</span>
                  </div>
                  <Textarea
                    value={veoPrompt}
                    onChange={(e) => setVeoPrompt(e.target.value)}
                    maxLength={5000}
                    rows={5}
                    placeholder="A cinematic drone shot over a coastal city at golden hour, waves crashing on rocky shores..."
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!veoTitle.trim() || isGeneratingPrompt}
                      onClick={handleGenerateVeoPrompt}
                    >
                      {isGeneratingPrompt ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <BrainCircuit className="mr-1 h-3 w-3" />
                      )}
                      AI Generate
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={!veoPrompt.trim() || isEnhancingPrompt}
                        >
                          {isEnhancingPrompt ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="mr-1 h-3 w-3" />
                          )}
                          Enhance
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {Object.entries(VEO_ENHANCEMENT_LABELS).map(([key, label], idx) => (
                          <span key={key}>
                            {idx === 4 && <DropdownMenuSeparator />}
                            <DropdownMenuItem onClick={() => handleEnhanceVeoPrompt(key)}>
                              {label}
                            </DropdownMenuItem>
                          </span>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aspect Ratio</Label>
                    <Select value={veoAspectRatio} onValueChange={(v) => setVeoAspectRatio(v as VeoAspectRatio)}>
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
                      value={String(veoDuration)}
                      onValueChange={(v) => setVeoDuration(Number(v) as ExtendedDuration)}
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
                        <SelectItem value="300" className="text-xs">5 minutes</SelectItem>
                        <SelectItem value="600" className="text-xs">10 minutes</SelectItem>
                        <SelectItem value="1800" className="text-xs">30 minutes</SelectItem>
                        <SelectItem value="2700" className="text-xs">45 minutes</SelectItem>
                        <SelectItem value="3600" className="text-xs">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Quality</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setVeoModel('veo-3.1-fast-generate-preview')}
                        className={cn(
                          'flex h-8 items-center justify-center gap-1 rounded-md border text-[10px] font-medium transition-colors',
                          veoModel === 'veo-3.1-fast-generate-preview'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background hover:bg-accent'
                        )}
                      >
                        <Zap className="h-3 w-3" />
                        Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setVeoModel('veo-3.1-generate-preview')}
                        className={cn(
                          'flex h-8 items-center justify-center gap-1 rounded-md border text-[10px] font-medium transition-colors',
                          veoModel === 'veo-3.1-generate-preview'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background hover:bg-accent'
                        )}
                      >
                        <Sparkles className="h-3 w-3" />
                        4K
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audio toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Generate Audio</p>
                      <p className="text-[10px] text-muted-foreground">AI-generated sound effects and ambient audio</p>
                    </div>
                  </div>
                  <Switch checked={veoAudio} onCheckedChange={setVeoAudio} />
                </div>

                {/* Credit cost */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{veoCreditCost} credits</p>
                  </div>
                  <p className={cn(
                    'text-sm font-medium',
                    hasEnoughCredits ? 'text-green-600' : 'text-destructive'
                  )}>
                    {creditsRemaining} available
                  </p>
                </div>

                {!hasEnoughCredits && (
                  <p className="text-xs text-destructive">
                    Insufficient credits. Need {veoCreditCost}, have {creditsRemaining}.
                  </p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {limitReached && mode !== 'veo' && (
          <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            You&apos;ve reached your monthly video limit.{' '}
            <button
              type="button"
              className="underline font-medium"
              onClick={() => setShowUpgradeModal(true)}
            >
              Upgrade your plan
            </button>{' '}
            for more videos.
          </div>
        )}

        {mode === 'veo' ? (
          hasVeoAccess && (
            <Button
              onClick={handleVeoGenerate}
              disabled={!canGenerateVeo}
              className="mt-4 w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Video ({veoCreditCost} credits)
                </>
              )}
            </Button>
          )
        ) : (
          <Button
            onClick={limitReached ? () => setShowUpgradeModal(true) : handleGenerate}
            disabled={limitReached ? false : !canGenerate}
            className="mt-4 w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : limitReached ? (
              'Upgrade Plan'
            ) : (
              'Generate Video'
            )}
          </Button>
        )}

        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          reason="video_limit"
          currentPlan={planId}
        />
      </CardContent>
    </Card>
  )
}
