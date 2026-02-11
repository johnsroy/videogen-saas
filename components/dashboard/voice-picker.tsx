'use client'

import { memo, useState, useEffect, useMemo, useRef } from 'react'
import { Loader2, Search, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { HeyGenVoice } from '@/lib/heygen-types'
import { cn } from '@/lib/utils'

interface VoicePickerProps {
  selected: string | null
  onSelect: (voiceId: string) => void
  languageFilter?: string
}

export const VoicePicker = memo(function VoicePicker({ selected, onSelect, languageFilter }: VoicePickerProps) {
  const [voices, setVoices] = useState<HeyGenVoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/heygen/voices')
      .then((res) => res.json())
      .then((data) => setVoices(data.voices ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Group voices by language, apply filters
  const grouped = useMemo(() => {
    let filtered = voices

    // Filter by language if prop provided
    if (languageFilter) {
      filtered = filtered.filter((v) =>
        v.language.toLowerCase().includes(languageFilter.toLowerCase())
      )
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.language.toLowerCase().includes(q) ||
          (v.gender && v.gender.toLowerCase().includes(q))
      )
    }

    // Group by language
    const groups: Record<string, HeyGenVoice[]> = {}
    for (const voice of filtered) {
      const lang = voice.language || 'Unknown'
      if (!groups[lang]) groups[lang] = []
      groups[lang].push(voice)
    }

    // Sort languages alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [voices, languageFilter, search])

  const selectedVoice = voices.find((v) => v.voice_id === selected)

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
    <div className="space-y-2" ref={containerRef}>
      <p className="text-sm font-medium">Select Voice</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            !selected && 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {selectedVoice
              ? `${selectedVoice.name} (${selectedVoice.language}${selectedVoice.gender ? ` · ${selectedVoice.gender}` : ''})`
              : 'Choose a voice...'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            {/* Search input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search voices..."
                  className="h-8 pl-8 text-xs"
                  autoFocus
                />
              </div>
            </div>

            {/* Grouped voice list */}
            <div className="max-h-64 overflow-y-auto p-1">
              {grouped.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No voices found
                </p>
              ) : (
                grouped.map(([language, langVoices]) => (
                  <div key={language}>
                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover">
                      {language} ({langVoices.length})
                    </p>
                    {langVoices.map((voice) => (
                      <button
                        key={voice.voice_id}
                        type="button"
                        onClick={() => {
                          onSelect(voice.voice_id)
                          setOpen(false)
                          setSearch('')
                        }}
                        className={cn(
                          'flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer',
                          selected === voice.voice_id && 'bg-accent text-accent-foreground font-medium'
                        )}
                      >
                        {voice.name}
                        {voice.gender && (
                          <span className="ml-auto text-xs text-muted-foreground">{voice.gender}</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
