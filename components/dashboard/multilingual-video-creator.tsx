'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Globe, Loader2, Sparkles, Video, Check, Copy } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import { TONE_OPTIONS, DURATION_OPTIONS } from '@/lib/ai-prompts'
import { AvatarPicker } from '@/components/dashboard/avatar-picker'
import { VoicePicker } from '@/components/dashboard/voice-picker'

interface MultilingualVideoCreatorProps {
  isProPlan: boolean
  aiUsageThisMonth: number
  videosThisMonth: number
}

type Step = 'setup' | 'script' | 'video'

export function MultilingualVideoCreator({
  isProPlan,
  aiUsageThisMonth,
  videosThisMonth,
}: MultilingualVideoCreatorProps) {
  // Step state
  const [step, setStep] = useState<Step>('setup')

  // Setup inputs
  const [language, setLanguage] = useState('')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('')
  const [duration, setDuration] = useState(60)
  const [audience, setAudience] = useState('')
  const [langSearch, setLangSearch] = useState('')

  // Generated script
  const [script, setScript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Video creation
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [videoCreated, setVideoCreated] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [usageCount, setUsageCount] = useState(aiUsageThisMonth)
  const [copied, setCopied] = useState(false)

  const limitReached = !isProPlan && usageCount >= 10
  const videoLimitReached = !isProPlan && videosThisMonth >= 3

  const selectedLang = SUPPORTED_LANGUAGES.find((l) => l.code === language)

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

  const stats = useMemo(() => {
    const words = script.trim() ? script.trim().split(/\s+/).length : 0
    return { words }
  }, [script])

  async function handleGenerate() {
    if (!language || !topic.trim()) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-multilingual-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          language: selectedLang?.name ?? language,
          duration_seconds: duration,
          tone: tone || undefined,
          audience: audience.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate script')
        return
      }
      setScript(data.script)
      setUsageCount((c) => c + 1)
      setStep('script')
    } catch {
      setError('Failed to generate script')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCreateVideo() {
    if (!script.trim() || !selectedAvatar || !selectedVoice) return
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/heygen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${selectedLang?.name ?? language}: ${topic.trim().slice(0, 50)}`,
          mode: 'avatar',
          avatar_id: selectedAvatar,
          voice_id: selectedVoice,
          script: script.trim(),
          dimension: '1920x1080',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create video')
        return
      }
      setVideoCreated(true)
      window.dispatchEvent(new CustomEvent('video-created'))
    } catch {
      setError('Failed to create video')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleStartOver() {
    setStep('setup')
    setScript('')
    setSelectedAvatar(null)
    setSelectedVoice(null)
    setVideoCreated(false)
    setError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Multi-Language Video Creator
        </CardTitle>
        <CardDescription>
          Generate a script in any language and create a video — all in one flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className={step === 'setup' ? 'font-bold text-primary' : 'text-muted-foreground'}>
            1. Setup
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={step === 'script' ? 'font-bold text-primary' : 'text-muted-foreground'}>
            2. Script
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={step === 'video' ? 'font-bold text-primary' : 'text-muted-foreground'}>
            3. Video
          </span>
        </div>

        {/* Step 1: Language & Topic */}
        {step === 'setup' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Language</Label>
              <Input
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search language..."
                className="h-7 text-xs"
              />
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value)
                  setLangSearch('')
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a language...</option>
                {filteredLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Topic</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Benefits of AI in healthcare"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TONE_OPTIONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <div className="flex gap-1">
                  {DURATION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={duration === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 flex-1 text-xs px-1"
                      onClick={() => setDuration(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Target Audience</Label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. business professionals, students"
                maxLength={200}
                className="h-8 text-xs"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!language || !topic.trim() || isGenerating || limitReached}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Generating {selectedLang?.name} Script...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Generate Script in {selectedLang?.name ?? 'Selected Language'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Review Script */}
        {step === 'script' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Generated Script ({selectedLang?.name})
              </Label>
              <span className="text-[10px] text-muted-foreground">{stats.words} words</span>
            </div>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={8}
              className="resize-y text-sm"
              dir={selectedLang?.rtl ? 'rtl' : 'ltr'}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep('setup')}>
                Back
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? (
                  <><Check className="mr-1.5 h-3.5 w-3.5" />Copied</>
                ) : (
                  <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                Regenerate
              </Button>
              <Button size="sm" onClick={() => setStep('video')}>
                <Video className="mr-1.5 h-3.5 w-3.5" />
                Create Video
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Avatar & Voice, Create Video */}
        {step === 'video' && !videoCreated && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Select an avatar and a <strong>{selectedLang?.name}</strong> voice for your video.
            </p>

            <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            <VoicePicker
              selected={selectedVoice}
              onSelect={setSelectedVoice}
              languageFilter={selectedLang?.name}
            />

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep('script')}>
                Back
              </Button>
              <Button
                onClick={handleCreateVideo}
                disabled={!selectedAvatar || !selectedVoice || isCreating || videoLimitReached}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Creating Video...
                  </>
                ) : (
                  <>
                    <Video className="mr-1.5 h-4 w-4" />
                    Create {selectedLang?.name} Video
                  </>
                )}
              </Button>
            </div>

            {videoLimitReached && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Free plan video limit reached (3/month). Upgrade to Pro for unlimited.
              </p>
            )}
          </div>
        )}

        {/* Success state */}
        {videoCreated && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">Video is being created!</p>
              <p className="text-sm text-muted-foreground">
                Your {selectedLang?.name} video is processing. Check the Create tab for status.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleStartOver}>
              Create Another
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {limitReached && step === 'setup' && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Free plan AI limit reached (10/month). Upgrade to Pro for unlimited.
          </p>
        )}

        {!isProPlan && step === 'setup' && (
          <span className="text-xs text-muted-foreground">
            {usageCount} / 10 AI uses this month
          </span>
        )}
      </CardContent>
    </Card>
  )
}
