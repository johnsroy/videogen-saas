'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrainCircuit, Loader2, Copy, Check, Instagram, Twitter } from 'lucide-react'
import type { VideoRecord } from '@/lib/heygen-types'

interface SocialCaptionsProps {
  video: VideoRecord
}

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { key: 'tiktok', label: 'TikTok', icon: null, color: 'text-cyan-500' },
  { key: 'linkedin', label: 'LinkedIn', icon: null, color: 'text-blue-600' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'text-sky-400' },
] as const

export function SocialCaptions({ video }: SocialCaptionsProps) {
  const [captions, setCaptions] = useState<Record<string, string> | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-social-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: video.title,
          script: video.script,
          prompt: video.prompt,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate captions')
        return
      }
      setCaptions(data.captions)
    } catch {
      setError('Failed to generate captions')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCopy(platform: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(platform)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!captions) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <BrainCircuit className="mr-1.5 h-3.5 w-3.5" />
          )}
          AI Social Captions
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-medium">
          <BrainCircuit className="h-3.5 w-3.5 text-primary" />
          AI Social Captions
        </h4>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Regenerate'}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map(({ key, label, color }) => {
          const text = captions[key]
          if (!text) return null
          return (
            <div key={key} className="rounded-lg border p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-[10px] ${color}`}>
                  {label}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => handleCopy(key, text)}
                >
                  {copied === key ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                {text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
