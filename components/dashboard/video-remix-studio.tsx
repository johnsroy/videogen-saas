'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AvatarPicker } from './avatar-picker'
import { VoicePicker } from './voice-picker'
import { RefreshCw, Loader2, Film } from 'lucide-react'
import type { VideoRecord, HeyGenAvatar, HeyGenVoice } from '@/lib/heygen-types'

interface VideoRemixStudioProps {
  completedVideos: VideoRecord[]
  isProPlan: boolean
  videosThisMonth: number
}

export function VideoRemixStudio({
  completedVideos,
  isProPlan,
  videosThisMonth,
}: VideoRemixStudioProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [avatarId, setAvatarId] = useState<string | null>(null)
  const [voiceId, setVoiceId] = useState<string | null>(null)
  const [dimension, setDimension] = useState('1280x720')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Lazy-load avatar/voice names for displaying original video info
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([])
  const [voices, setVoices] = useState<HeyGenVoice[]>([])

  const selectedVideo = completedVideos.find((v) => v.id === selectedVideoId)
  const limitReached = !isProPlan && videosThisMonth >= 5

  // Fetch avatar/voice names when user first selects a video
  useEffect(() => {
    if (!selectedVideoId || avatars.length > 0) return
    Promise.all([
      fetch('/api/heygen/avatars').then((r) => r.json()).catch(() => ({ avatars: [] })),
      fetch('/api/heygen/voices').then((r) => r.json()).catch(() => ({ voices: [] })),
    ]).then(([avatarData, voiceData]) => {
      setAvatars(avatarData.avatars ?? [])
      setVoices(voiceData.voices ?? [])
    })
  }, [selectedVideoId, avatars.length])

  function handleVideoSelect(videoId: string) {
    setSelectedVideoId(videoId)
    setSuccess(false)
    setError(null)
    const video = completedVideos.find((v) => v.id === videoId)
    if (video) {
      setTitle(video.title + ' (Remix)')
      setScript(video.script || video.prompt || '')
      setAvatarId(video.avatar_id)
      setVoiceId(video.voice_id)
      setDimension(video.dimension || '1280x720')
    }
  }

  async function handleRemix() {
    if (!title.trim() || !script.trim()) return
    setIsGenerating(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/heygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'avatar',
          title,
          avatar_id: avatarId,
          voice_id: voiceId,
          script,
          dimension,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate remix')
        return
      }
      window.dispatchEvent(new CustomEvent('video-created', { detail: data.video }))
      setSuccess(true)
    } catch {
      setError('Failed to generate remix')
    } finally {
      setIsGenerating(false)
    }
  }

  if (completedVideos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Video Remix Studio
          </CardTitle>
          <CardDescription>Remix an existing video with different settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Film className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No completed videos yet. Create a video first to remix it.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Video Remix Studio
        </CardTitle>
        <CardDescription>Select a video and modify its settings to create a new version</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Original Video</Label>
          <Select value={selectedVideoId} onValueChange={handleVideoSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a video to remix..." />
            </SelectTrigger>
            <SelectContent>
              {completedVideos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                  {video.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVideoId && selectedVideo && (
          <>
            {/* Side by side: original + settings */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Original */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Original</Label>
                {selectedVideo.video_url ? (
                  <div className="overflow-hidden rounded-lg border">
                    <video
                      src={selectedVideo.video_url}
                      controls
                      className="w-full"
                      style={{ maxHeight: 200 }}
                    />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border bg-muted">
                    <Film className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Avatar: {avatars.find((a) => a.avatar_id === selectedVideo.avatar_id)?.avatar_name || selectedVideo.avatar_id || 'N/A'}</p>
                  <p>Voice: {voices.find((v) => v.voice_id === selectedVideo.voice_id)?.name || selectedVideo.voice_id || 'N/A'}</p>
                  <p>Dimension: {selectedVideo.dimension || 'N/A'}</p>
                </div>
              </div>

              {/* Remix settings */}
              <div className="space-y-3">
                <Label className="text-muted-foreground">Remix Settings</Label>
                <div className="space-y-2">
                  <Label htmlFor="remix-title" className="text-xs">Title</Label>
                  <Input
                    id="remix-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Remix title"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Aspect Ratio</Label>
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
              </div>
            </div>

            {/* Avatar and voice pickers — self-loading */}
            <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
            <VoicePicker selected={voiceId} onSelect={setVoiceId} />

            {/* Script */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="remix-script">Script</Label>
                <span className="text-xs text-muted-foreground">{script.length}/5000</span>
              </div>
              <Textarea
                id="remix-script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Edit the script..."
              />
            </div>

            {/* Generate button */}
            <Button
              onClick={handleRemix}
              disabled={isGenerating || limitReached || !title.trim() || !script.trim() || !avatarId || !voiceId}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Remix...
                </>
              ) : limitReached ? (
                'Upgrade to Pro'
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Remix Video
                </>
              )}
            </Button>

            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Remix started! Check the Create tab to see your video processing.
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {limitReached && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Free plan limit reached (5 videos/month). Upgrade to Pro for unlimited.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
