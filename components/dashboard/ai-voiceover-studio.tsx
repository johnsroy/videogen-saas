'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Mic,
  Loader2,
  Download,
  Play,
  Pause,
  Volume2,
  Coins,
  User,
} from 'lucide-react'
import type { VideoRecord } from '@/lib/heygen-types'

interface Voice {
  id: string
  name: string
  gender: string
  description: string
}

interface AiVoiceoverStudioProps {
  video: VideoRecord
  videoElement: HTMLVideoElement | null
  creditsRemaining: number
  onVoiceoverGenerated?: (voiceoverId: string, audioUrl: string) => void
}

export function AiVoiceoverStudio({ video, videoElement, creditsRemaining, onVoiceoverGenerated }: AiVoiceoverStudioProps) {
  const [script, setScript] = useState(video.script || video.prompt || '')
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [instructions, setInstructions] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [credits, setCredits] = useState(creditsRemaining)
  const [voices, setVoices] = useState<Voice[]>([])
  const [playOverVideo, setPlayOverVideo] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load voices
  useEffect(() => {
    fetch('/api/tts/voices')
      .then((r) => r.json())
      .then((d) => setVoices(d.voices || []))
      .catch(() => {})
  }, [])

  // Update script when video changes
  useEffect(() => {
    setScript(video.script || video.prompt || '')
    setAudioUrl(null)
    setError(null)
  }, [video.id, video.script, video.prompt])

  // Sync audio with video playback when "Play Over Video" is enabled
  useEffect(() => {
    if (!videoElement || !audioRef.current || !playOverVideo) return

    const audio = audioRef.current

    function onPlay() {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
    function onPause() {
      audio.pause()
    }

    videoElement.addEventListener('play', onPlay)
    videoElement.addEventListener('pause', onPause)
    videoElement.addEventListener('ended', onPause)

    return () => {
      videoElement.removeEventListener('play', onPlay)
      videoElement.removeEventListener('pause', onPause)
      videoElement.removeEventListener('ended', onPause)
    }
  }, [videoElement, playOverVideo])

  async function handleGenerate() {
    if (!script.trim()) return
    setIsGenerating(true)
    setError(null)
    setAudioUrl(null)

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: video.id,
          script: script.trim(),
          voice: selectedVoice,
          instructions: instructions.trim() || undefined,
          speed,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate voiceover')
        return
      }

      setAudioUrl(data.voiceover.audio_url)
      setCredits((c) => Math.max(0, c - 1))
      onVoiceoverGenerated?.(data.voiceover.id, data.voiceover.audio_url)
    } catch {
      setError('Failed to generate voiceover. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  function handleAudioEnded() {
    setIsPlaying(false)
  }

  const charCount = script.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" />
          AI Voiceover
        </CardTitle>
        <CardDescription className="text-xs">
          Generate natural voiceovers with OpenAI — describe the speaking style in plain English
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Script */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Script</Label>
            <span className="text-[10px] text-muted-foreground">{charCount}/5000</span>
          </div>
          <Textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value)
              setAudioUrl(null)
            }}
            rows={4}
            maxLength={5000}
            placeholder="Enter the text to speak..."
            className="text-xs resize-y"
          />
        </div>

        {/* Voice Picker */}
        <div className="space-y-1.5">
          <Label className="text-xs">Voice</Label>
          <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
            {voices.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-all text-xs ${
                  selectedVoice === v.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <User className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{v.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{v.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Style Instructions */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Speaking Style <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            placeholder='e.g. "Speak warmly with enthusiasm, pause slightly after questions. Professional news anchor tone."'
            className="text-xs resize-none"
          />
        </div>

        {/* Speed */}
        <div className="space-y-1.5">
          <Label className="text-xs">Speed: {speed}x</Label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground">0.5x</span>
            <Slider
              value={[speed]}
              onValueChange={([v]) => setSpeed(Math.round(v * 4) / 4)}
              min={0.5}
              max={2.0}
              step={0.25}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground">2x</span>
          </div>
        </div>

        {/* Generate */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={!script.trim() || isGenerating || credits < 1}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic className="mr-1.5 h-3.5 w-3.5" />
                Generate (1 credit)
              </>
            )}
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
            <Coins className="h-3 w-3" />
            {credits} credits
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Audio Result */}
        {audioUrl && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={togglePlayback}>
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
              <span className="text-xs font-medium flex-1">Voiceover Ready</span>
              <Button variant="outline" size="sm" asChild>
                <a href={audioUrl} download={`voiceover-${video.id}.mp3`}>
                  <Download className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
            {videoElement && (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={playOverVideo}
                  onChange={(e) => setPlayOverVideo(e.target.checked)}
                  className="h-3 w-3 rounded"
                />
                <Volume2 className="h-3 w-3 text-muted-foreground" />
                Play over video
              </label>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
