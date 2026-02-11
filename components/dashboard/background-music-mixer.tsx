'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Music, Play, Pause } from 'lucide-react'

const TRACKS = [
  { id: 'upbeat', label: 'Upbeat', file: '/audio/upbeat.wav' },
  { id: 'corporate', label: 'Corporate', file: '/audio/corporate.wav' },
  { id: 'calm', label: 'Calm', file: '/audio/calm.wav' },
  { id: 'energetic', label: 'Energetic', file: '/audio/energetic.wav' },
]

interface BackgroundMusicMixerProps {
  videoElement: HTMLVideoElement | null
}

export function BackgroundMusicMixer({ videoElement }: BackgroundMusicMixerProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('')
  const [volume, setVolume] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  const handleTrackChange = useCallback((trackId: string) => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setSelectedTrack(trackId)

    if (!trackId) {
      setIsPlaying(false)
      return
    }

    const track = TRACKS.find((t) => t.id === trackId)
    if (!track) return

    const audio = new Audio(track.file)
    audio.loop = true
    audio.volume = volume / 100
    audioRef.current = audio

    // If video is currently playing, start music immediately
    if (videoElement && !videoElement.paused) {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }, [videoElement, volume])

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Background Music</span>
      </div>
      <div className="flex items-center gap-3">
        <Select value={selectedTrack} onValueChange={handleTrackChange}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="No music" />
          </SelectTrigger>
          <SelectContent>
            {TRACKS.map((track) => (
              <SelectItem key={track.id} value={track.id}>
                {track.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTrack && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleMusic}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <div className="flex items-center gap-2 flex-1 max-w-32">
              <Slider
                value={[volume]}
                onValueChange={([v]) => setVolume(v)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground w-8">{volume}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
