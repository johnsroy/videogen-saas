'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Subtitles, Loader2, Download, Film, Languages } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import type { VideoRecord } from '@/lib/heygen-types'

interface CaptionTranslatorProps {
  completedVideos: VideoRecord[]
  isProPlan: boolean
  aiUsageThisMonth: number
}

export function CaptionTranslator({ completedVideos, isProPlan, aiUsageThisMonth }: CaptionTranslatorProps) {
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('')
  const [originalCaptions, setOriginalCaptions] = useState<string | null>(null)
  const [translatedCaptions, setTranslatedCaptions] = useState<string | null>(null)
  const [isLoadingCaptions, setIsLoadingCaptions] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usageCount, setUsageCount] = useState(aiUsageThisMonth)
  const [langSearch, setLangSearch] = useState('')

  const limitReached = !isProPlan && usageCount >= 10
  const selectedVideo = completedVideos.find((v) => v.id === selectedVideoId)
  const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage)

  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return SUPPORTED_LANGUAGES
    const q = langSearch.toLowerCase()
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    )
  }, [langSearch])

  async function handleVideoSelect(videoId: string) {
    setSelectedVideoId(videoId)
    setOriginalCaptions(null)
    setTranslatedCaptions(null)
    setError(null)

    setIsLoadingCaptions(true)
    try {
      const res = await fetch(`/api/captions/${videoId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.caption?.content) {
          setOriginalCaptions(data.caption.content)
        } else {
          setError('No captions found for this video. Generate captions first in the Smart Editing tab.')
        }
      } else {
        setError('No captions found. Generate captions first in the Smart Editing tab.')
      }
    } catch {
      setError('Failed to load captions')
    } finally {
      setIsLoadingCaptions(false)
    }
  }

  async function handleTranslate() {
    if (!selectedVideoId || !targetLanguage || !originalCaptions) return
    setIsTranslating(true)
    setError(null)
    setTranslatedCaptions(null)
    try {
      const res = await fetch('/api/ai/translate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: selectedVideoId,
          target_language: targetLang?.name ?? targetLanguage,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to translate captions')
        return
      }
      setTranslatedCaptions(data.translated_captions)
      setUsageCount((c) => c + 1)
    } catch {
      setError('Failed to translate captions')
    } finally {
      setIsTranslating(false)
    }
  }

  function handleDownload() {
    if (!translatedCaptions || !selectedVideo || !targetLang) return
    const blob = new Blob([translatedCaptions], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `captions-${selectedVideo.title.replace(/\s+/g, '-').toLowerCase()}-${targetLang.code}.vtt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (completedVideos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Subtitles className="h-5 w-5" />
            Caption Translator
          </CardTitle>
          <CardDescription>Translate video captions to any language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Film className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No completed videos yet. Create a video and generate captions first.
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
          <Subtitles className="h-5 w-5" />
          Caption Translator
        </CardTitle>
        <CardDescription>Translate existing video captions to 175+ languages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video selector */}
        <div className="space-y-2">
          <Label>Select a Video</Label>
          <Select value={selectedVideoId} onValueChange={handleVideoSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a video with captions..." />
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

        {isLoadingCaptions && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading captions...</span>
          </div>
        )}

        {originalCaptions && (
          <>
            {/* Original captions preview */}
            <div className="space-y-2">
              <Label className="text-xs">Original Captions</Label>
              <pre className="max-h-32 overflow-y-auto rounded-md border bg-muted/50 p-3 text-xs font-mono">
                {originalCaptions}
              </pre>
            </div>

            {/* Target language selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Translate To</Label>
              <Input
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search language..."
                className="h-7 text-xs"
              />
              <select
                value={targetLanguage}
                onChange={(e) => {
                  setTargetLanguage(e.target.value)
                  setLangSearch('')
                  setTranslatedCaptions(null)
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select target language...</option>
                {filteredLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Translate button */}
            <Button
              onClick={handleTranslate}
              disabled={!targetLanguage || isTranslating || limitReached}
              className="w-full"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Translating Captions...
                </>
              ) : (
                <>
                  <Languages className="mr-1.5 h-4 w-4" />
                  Translate Captions
                </>
              )}
            </Button>

            {/* Translated output */}
            {translatedCaptions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    Translated Captions ({targetLang?.name})
                  </Label>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download .vtt
                  </Button>
                </div>
                <pre
                  className="max-h-48 overflow-y-auto rounded-md border bg-muted/50 p-3 text-xs font-mono"
                  dir={targetLang?.rtl ? 'rtl' : 'ltr'}
                >
                  {translatedCaptions}
                </pre>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {limitReached && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Free plan AI limit reached (10/month). Upgrade to Pro for unlimited.
          </p>
        )}

        {!isProPlan && originalCaptions && (
          <span className="text-xs text-muted-foreground">
            {usageCount} / 10 AI uses this month
          </span>
        )}
      </CardContent>
    </Card>
  )
}
