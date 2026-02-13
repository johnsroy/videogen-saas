'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Languages, Loader2, Copy, Check, ArrowRight, ArrowRightLeft } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import { canUseAI, getAILimit } from '@/lib/plan-utils'
import type { PlanId } from '@/lib/plans'

interface ScriptTranslatorProps {
  planId: PlanId
  aiUsageThisMonth: number
}

export function ScriptTranslator({ planId, aiUsageThisMonth }: ScriptTranslatorProps) {
  const router = useRouter()
  const [script, setScript] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [targetLanguage, setTargetLanguage] = useState('')
  const [translatedScript, setTranslatedScript] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [usageCount, setUsageCount] = useState(aiUsageThisMonth)
  const [langSearch, setLangSearch] = useState('')

  const aiLimit = getAILimit(planId)
  const limitReached = !canUseAI(planId, usageCount)

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

  const sourceStats = useMemo(() => {
    const words = script.trim() ? script.trim().split(/\s+/).length : 0
    return { words, chars: script.length }
  }, [script])

  const translatedStats = useMemo(() => {
    if (!translatedScript) return { words: 0, chars: 0 }
    const words = translatedScript.trim() ? translatedScript.trim().split(/\s+/).length : 0
    return { words, chars: translatedScript.length }
  }, [translatedScript])

  const sourceLang = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLanguage)
  const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage)

  async function handleTranslate() {
    if (!script.trim() || !targetLanguage) return
    setIsTranslating(true)
    setError(null)
    setTranslatedScript(null)
    try {
      const res = await fetch('/api/ai/translate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script.trim(),
          source_language: sourceLang?.name ?? 'English',
          target_language: targetLang?.name ?? targetLanguage,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to translate script')
        return
      }
      setTranslatedScript(data.translated_script)
      setUsageCount((c) => c + 1)
    } catch {
      setError('Failed to translate script')
    } finally {
      setIsTranslating(false)
    }
  }

  async function handleCopy() {
    if (!translatedScript) return
    await navigator.clipboard.writeText(translatedScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleUseInVideo() {
    if (!translatedScript) return
    sessionStorage.setItem('prefill-script', translatedScript)
    router.push('/dashboard')
  }

  function handleSwapLanguages() {
    if (!targetLanguage) return
    const temp = sourceLanguage
    setSourceLanguage(targetLanguage)
    setTargetLanguage(temp)
    if (translatedScript) {
      setScript(translatedScript)
      setTranslatedScript(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Script Translator
        </CardTitle>
        <CardDescription>
          Translate your video scripts to 175+ languages with natural, spoken-word quality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language selectors */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">From</Label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 mb-0"
            onClick={handleSwapLanguages}
            disabled={!targetLanguage}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">To</Label>
            <div className="space-y-1">
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
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                size={1}
              >
                <option value="">Select target language...</option>
                {filteredLanguages
                  .filter((l) => l.code !== sourceLanguage)
                  .map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Side-by-side script panels */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Original Script</Label>
              <span className="text-[10px] text-muted-foreground">
                {sourceStats.words} words · {sourceStats.chars} chars
              </span>
            </div>
            <Textarea
              value={script}
              onChange={(e) => {
                setScript(e.target.value)
                setTranslatedScript(null)
              }}
              rows={8}
              placeholder="Paste or type your script here..."
              maxLength={5000}
              className="resize-y text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Translation</Label>
              {translatedScript && (
                <span className="text-[10px] text-muted-foreground">
                  {translatedStats.words} words · {translatedStats.chars} chars
                </span>
              )}
            </div>
            <div className="relative">
              <Textarea
                value={translatedScript ?? ''}
                readOnly
                rows={8}
                placeholder={isTranslating ? 'Translating...' : 'Translation will appear here...'}
                className="resize-y text-sm bg-muted/30"
                dir={targetLang?.rtl ? 'rtl' : 'ltr'}
              />
              {isTranslating && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleTranslate}
            disabled={!script.trim() || !targetLanguage || isTranslating || limitReached}
          >
            {isTranslating ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="mr-1.5 h-4 w-4" />
                Translate
              </>
            )}
          </Button>

          {translatedScript && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>

              <Button size="sm" onClick={handleUseInVideo}>
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                Use in Video
              </Button>
            </>
          )}

          {aiLimit !== null && (
            <span className="text-xs text-muted-foreground ml-auto">
              {usageCount} / {aiLimit} AI uses
            </span>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {limitReached && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            AI limit reached ({aiLimit}/month). Upgrade your plan for unlimited AI features.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
