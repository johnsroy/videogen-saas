'use client'

import { memo, useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { HeyGenVoice } from '@/lib/heygen-types'

interface VoicePickerProps {
  selected: string | null
  onSelect: (voiceId: string) => void
}

export const VoicePicker = memo(function VoicePicker({ selected, onSelect }: VoicePickerProps) {
  const [voices, setVoices] = useState<HeyGenVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/heygen/voices')
      .then((res) => res.json())
      .then((data) => setVoices(data.voices ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Select Voice</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading voices...
        </div>
      </div>
    )
  }

  if (error || voices.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Select Voice</p>
        <p className="text-sm text-destructive">Failed to load voices</p>
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
