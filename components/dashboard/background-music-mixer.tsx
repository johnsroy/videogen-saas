'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Music, Play, Pause } from 'lucide-react'

type Category = 'all' | 'upbeat' | 'corporate' | 'calm' | 'cinematic' | 'lofi' | 'epic'

interface Track {
  id: string
  label: string
  file: string
  category: Category
}

const TRACKS: Track[] = [
  // Upbeat
  { id: 'upbeat', label: 'Upbeat', file: '/audio/upbeat.wav', category: 'upbeat' },
  { id: 'energetic', label: 'Energetic', file: '/audio/energetic.wav', category: 'upbeat' },
  { id: 'happy-pop', label: 'Happy Pop', file: '/audio/happy-pop.wav', category: 'upbeat' },
  // Corporate
  { id: 'corporate', label: 'Corporate', file: '/audio/corporate.wav', category: 'corporate' },
  { id: 'business', label: 'Business', file: '/audio/business.wav', category: 'corporate' },
  // Calm
  { id: 'calm', label: 'Calm', file: '/audio/calm.wav', category: 'calm' },
  { id: 'ambient', label: 'Ambient', file: '/audio/ambient.wav', category: 'calm' },
  // Cinematic
  { id: 'cinematic', label: 'Cinematic', file: '/audio/cinematic.wav', category: 'cinematic' },
  { id: 'dramatic', label: 'Dramatic', file: '/audio/dramatic.wav', category: 'cinematic' },
  // Lo-Fi
  { id: 'lofi-chill', label: 'Lo-Fi Chill', file: '/audio/lofi-chill.wav', category: 'lofi' },
  { id: 'lofi-beats', label: 'Lo-Fi Beats', file: '/audio/lofi-beats.wav', category: 'lofi' },
  // Epic
  { id: 'epic-intro', label: 'Epic Intro', file: '/audio/epic-intro.wav', category: 'epic' },
]

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upbeat', label: 'Upbeat' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'calm', label: 'Calm' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'lofi', label: 'Lo-Fi' },
  { id: 'epic', label: 'Epic' },
]

interface BackgroundMusicMixerProps {
  videoElement: HTMLVideoElement | null
}

export function BackgroundMusicMixer({ videoElement }: BackgroundMusicMixerProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('')
  const [volume, setVolume] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const [category, setCategory] = useState<Category>('all')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const filteredTracks = category === 'all'
    ? TRACKS
    : TRACKS.filter((t) => t.category === category)

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

  const handleTrackSelect = useCallback((trackId: string) => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    // Deselect if clicking same track
    if (selectedTrack === trackId) {
      setSelectedTrack('')
      setIsPlaying(false)
      return
    }

    setSelectedTrack(trackId)

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
  }, [videoElement, volume, selectedTrack])

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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">Background Music</span>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
              category === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
        {filteredTracks.map((track) => (
          <button
            key={track.id}
            onClick={() => handleTrackSelect(track.id)}
            className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all ${
              selectedTrack === track.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:border-primary/30'
            }`}
          >
            {selectedTrack === track.id && isPlaying ? (
              <Pause className="h-3 w-3 flex-shrink-0 text-primary" />
            ) : (
              <Play className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{track.label}</span>
          </button>
        ))}
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
          <span className="text-[10px] text-muted-foreground w-12 truncate">
            {TRACKS.find((t) => t.id === selectedTrack)?.label}
          </span>
          <Slider
            value={[volume]}
            onValueChange={([v]) => setVolume(v)}
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
