'use client'

import { useState } from 'react'
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
import { Video, Wand2, Loader2 } from 'lucide-react'
import type { HeyGenAvatar, HeyGenVoice } from '@/lib/heygen-types'

interface VideoGenerationCardProps {
  plan: string
  isProPlan: boolean
  videosThisMonth: number
  initialAvatars: HeyGenAvatar[]
  initialVoices: HeyGenVoice[]
}

export function VideoGenerationCard({ plan, isProPlan, videosThisMonth, initialAvatars, initialVoices }: VideoGenerationCardProps) {
  const [mode, setMode] = useState<'avatar' | 'prompt'>('avatar')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [prompt, setPrompt] = useState('')
  const [dimension, setDimension] = useState('1280x720')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limitReached = !isProPlan && videosThisMonth >= 5

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Generate Video
        </CardTitle>
        <CardDescription>
          {isProPlan
            ? 'Unlimited videos'
            : `${videosThisMonth} / 5 videos used this month`}
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
            <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} initialAvatars={initialAvatars} />
            <VoicePicker selected={selectedVoice} onSelect={setSelectedVoice} initialVoices={initialVoices} />

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
            You&apos;ve used all 5 free videos this month. Upgrade to Pro for unlimited videos.
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="mt-4 w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : limitReached ? (
            'Upgrade to Pro'
          ) : (
            'Generate Video'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
