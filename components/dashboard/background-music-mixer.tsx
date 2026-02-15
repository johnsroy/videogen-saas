'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Music, Play, Pause, Sparkles, Loader2, Coins } from 'lucide-react'

interface PresetTrack {
  id: string
  label: string
  file: string
  mood: string
}

const PRESET_TRACKS: PresetTrack[] = [
  { id: 'cinematic-score', label: 'Cinematic Score', file: '/audio/corporate.wav', mood: 'Sweeping orchestral' },
  { id: 'epic-orchestra', label: 'Epic Orchestra', file: '/audio/energetic.wav', mood: 'Powerful & heroic' },
  { id: 'ambient-soundscape', label: 'Ambient Soundscape', file: '/audio/calm.wav', mood: 'Serene & atmospheric' },
  { id: 'corporate-anthem', label: 'Corporate Anthem', file: '/audio/upbeat.wav', mood: 'Uplifting & professional' },
]

interface AiTrack {
  id: string
  prompt: string
  url: string
}

interface BackgroundMusicMixerProps {
  videoElement: HTMLVideoElement | null
  creditsRemaining: number
  onTrackSelected?: (selection: { type: 'preset' | 'ai'; id: string; url?: string } | null) => void
  onVolumeChanged?: (v: number) => void
  onCreditsChanged?: (c: number) => void
}

export function BackgroundMusicMixer({
  videoElement,
  creditsRemaining,
  onTrackSelected,
  onVolumeChanged,
  onCreditsChanged,
}: BackgroundMusicMixerProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('')
  const [selectedType, setSelectedType] = useState<'preset' | 'ai'>('preset')
  const [volume, setVolume] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // AI Music state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiDuration, setAiDuration] = useState(15)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiTracks, setAiTracks] = useState<AiTrack[]>([])
  const [credits, setCredits] = useState(creditsRemaining)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)

  // Sync music playback with video play/pause
  useEffect(() => {
    if (!videoElement) return

    function onPlay() {
      if (audioRef.current && selectedTrack) {
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    }
    function onPause() {
      if (audioRef.current) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
    function onEnded() {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setIsPlaying(false)
      }
    }

    videoElement.addEventListener('play', onPlay)
    videoElement.addEventListener('pause', onPause)
    videoElement.addEventListener('ended', onEnded)
    return () => {
      videoElement.removeEventListener('play', onPlay)
      videoElement.removeEventListener('pause', onPause)
      videoElement.removeEventListener('ended', onEnded)
    }
  }, [videoElement, selectedTrack])

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  const selectTrack = useCallback((trackId: string, type: 'preset' | 'ai', url: string) => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    // Deselect if clicking same track
    if (selectedTrack === trackId && selectedType === type) {
      setSelectedTrack('')
      setIsPlaying(false)
      onTrackSelected?.(null)
      return
    }

    setSelectedTrack(trackId)
    setSelectedType(type)

    const audio = new Audio(url)
    audio.loop = true
    audio.volume = volume / 100
    audioRef.current = audio

    onTrackSelected?.({ type, id: trackId, url: type === 'ai' ? url : undefined })

    // If video is currently playing, start music immediately
    if (videoElement && !videoElement.paused) {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }, [videoElement, volume, selectedTrack, selectedType, onTrackSelected])

  function handlePresetSelect(trackId: string) {
    const track = PRESET_TRACKS.find((t) => t.id === trackId)
    if (!track) return
    selectTrack(trackId, 'preset', track.file)
  }

  function handleAiTrackSelect(track: AiTrack) {
    selectTrack(track.id, 'ai', track.url)
  }

  function toggleMusic() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  function handleVolumeChange(v: number) {
    setVolume(v)
    onVolumeChanged?.(v)
  }

  async function handleEnhancePrompt() {
    if (!aiPrompt.trim()) return
    setIsEnhancing(true)
    setEnhanceError(null)

    try {
      const res = await fetch('/api/music/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setEnhanceError(data.error || 'Failed to enhance prompt')
        return
      }

      setAiPrompt(data.enhanced_prompt)
    } catch {
      setEnhanceError('Failed to enhance prompt. Please try again.')
    } finally {
      setIsEnhancing(false)
    }
  }

  async function handleGenerateMusic() {
    if (!aiPrompt.trim() || credits < 1) return
    setIsGenerating(true)
    setAiError(null)

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          duration_seconds: aiDuration,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setAiError(data.error || 'Failed to generate music')
        return
      }

      const newTrack: AiTrack = {
        id: data.track.id,
        prompt: aiPrompt.trim(),
        url: data.track.audio_url,
      }
      setAiTracks((prev) => [newTrack, ...prev])
      const newCredits = Math.max(0, credits - 1)
      setCredits(newCredits)
      onCreditsChanged?.(newCredits)

      // Auto-select the new track
      selectTrack(newTrack.id, 'ai', newTrack.url)
    } catch {
      setAiError('Failed to generate music. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const currentLabel =
    selectedType === 'preset'
      ? PRESET_TRACKS.find((t) => t.id === selectedTrack)?.label
      : aiTracks.find((t) => t.id === selectedTrack)?.prompt?.slice(0, 20)

  return (
    <div className="space-y-4">
      {/* Preset Tracks */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Preset Tracks</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_TRACKS.map((track) => (
            <button
              key={track.id}
              onClick={() => handlePresetSelect(track.id)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all text-left ${
                selectedTrack === track.id && selectedType === 'preset'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              {selectedTrack === track.id && selectedType === 'preset' && isPlaying ? (
                <Pause className="h-3 w-3 flex-shrink-0 text-primary" />
              ) : (
                <Play className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{track.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{track.mood}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Music Generation */}
      <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">AI Music Generator</span>
        </div>
        <div className="space-y-1.5">
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder='e.g. "Cinematic orchestral score with building tension for a product launch video"'
            className="text-xs resize-none"
          />
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground">Duration:</Label>
            <select
              value={aiDuration}
              onChange={(e) => setAiDuration(Number(e.target.value))}
              className="h-6 rounded border bg-background px-1.5 text-[10px]"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEnhancePrompt}
              disabled={!aiPrompt.trim() || isEnhancing}
              className="h-6 text-[10px] px-2"
              title="Enhance prompt with AI (free)"
            >
              {isEnhancing ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              Enhance
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateMusic}
              disabled={!aiPrompt.trim() || isGenerating || credits < 1}
              className="ml-auto h-6 text-[10px] px-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1 h-3 w-3" />
                  Generate (1 credit)
                </>
              )}
            </Button>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Coins className="h-3 w-3" />
              {credits}
            </div>
          </div>
        </div>
        {(aiError || enhanceError) && <p className="text-[10px] text-destructive">{aiError || enhanceError}</p>}

        {/* AI Generated Tracks */}
        {aiTracks.length > 0 && (
          <div className="space-y-1 mt-1.5">
            <span className="text-[10px] text-muted-foreground">Generated Tracks</span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {aiTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleAiTrackSelect(track)}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 w-full text-xs transition-all text-left ${
                    selectedTrack === track.id && selectedType === 'ai'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {selectedTrack === track.id && selectedType === 'ai' && isPlaying ? (
                    <Pause className="h-3 w-3 flex-shrink-0 text-primary" />
                  ) : (
                    <Play className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{track.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Volume Control */}
      {selectedTrack && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={toggleMusic}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <span className="text-[10px] text-muted-foreground w-16 truncate">
            {currentLabel}
          </span>
          <Slider
            value={[volume]}
            onValueChange={([v]) => handleVolumeChange(v)}
            min={0}
            max={100}
            step={5}
            className="flex-1 max-w-40"
          />
          <span className="text-[10px] text-muted-foreground w-6">{volume}%</span>
        </div>
      )}
    </div>
  )
}
