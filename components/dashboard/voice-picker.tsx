'use client'

import { memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HeyGenVoice } from '@/lib/heygen-types'

interface VoicePickerProps {
  selected: string | null
  onSelect: (voiceId: string) => void
  initialVoices: HeyGenVoice[]
}

export const VoicePicker = memo(function VoicePicker({ selected, onSelect, initialVoices }: VoicePickerProps) {
  const voices = initialVoices

  if (voices.length === 0) {
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
