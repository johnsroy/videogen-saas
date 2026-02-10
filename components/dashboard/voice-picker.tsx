'use client'

import { useState, useEffect, memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { HeyGenVoice } from '@/lib/heygen-types'

interface VoicePickerProps {
  selected: string | null
  onSelect: (voiceId: string) => void
}

export const VoicePicker = memo(function VoicePicker({ selected, onSelect }: VoicePickerProps) {
  const [voices, setVoices] = useState<HeyGenVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVoices() {
      try {
        const res = await fetch('/api/heygen/voices')
        if (!res.ok) throw new Error('Failed to fetch voices')
        const data = await res.json()
        setVoices(data.voices || [])
      } catch {
        setError('Failed to load voices')
      } finally {
        setLoading(false)
      }
    }
    fetchVoices()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Select Voice</p>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Select Voice</p>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Select Voice</p>
      <Select value={selected || ''} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a voice..." />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem key={voice.voice_id} value={voice.voice_id}>
              {voice.name} ({voice.language}{voice.gender ? ` - ${voice.gender}` : ''})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})
