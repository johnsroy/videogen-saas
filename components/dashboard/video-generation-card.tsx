'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { AvatarPicker } from './avatar-picker'
import { VoicePicker } from './voice-picker'
import { ScriptAiTools } from './script-ai-tools'
import { Video, Wand2, Loader2 } from 'lucide-react'
import { canGenerateVideo, getVideoLimit } from '@/lib/plan-utils'
import { UpgradeModal } from './upgrade-modal'
import type { PlanId } from '@/lib/plans'
import type { VideoRecord } from '@/lib/heygen-types'

interface VideoGenerationCardProps {
  planId: PlanId
  videosThisMonth: number
  aiUsageThisMonth: number
}

export function VideoGenerationCard({ planId, videosThisMonth, aiUsageThisMonth }: VideoGenerationCardProps) {
  const [mode, setMode] = useState<'avatar' | 'prompt'>('avatar')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [prompt, setPrompt] = useState('')
  const [dimension, setDimension] = useState('1280x720')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
        setMode('prompt')
        setPrompt(video.prompt)
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
    (mode === 'avatar'
      ? selectedAvatar && selectedVoice && script.trim().length > 0
      : prompt.trim().length > 0)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/heygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'avatar'
            ? { mode, title, avatar_id: selectedAvatar, voice_id: selectedVoice, script, dimension }
            : { mode, title, prompt, dimension }
        ),
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
      setPrompt('')
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
        <Tabs defaultValue="avatar" onValueChange={(v) => setMode(v as 'avatar' | 'prompt')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="avatar" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Avatar
            </TabsTrigger>
            <TabsTrigger value="prompt" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Prompt
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

          <TabsContent value="prompt" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-title">Title</Label>
              <Input
                id="prompt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Video"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt-text">Describe your video</Label>
                <span className="text-xs text-muted-foreground">{prompt.length}/5000</span>
              </div>
              <Textarea
                id="prompt-text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="A friendly presenter explaining the benefits of our product in a professional studio setting..."
              />
              <ScriptAiTools
                currentScript={prompt}
                onScriptChange={setPrompt}
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

            <p className="text-xs text-muted-foreground">
              An avatar and voice will be automatically selected. Your description will be used as the script.
            </p>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {limitReached && (
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
