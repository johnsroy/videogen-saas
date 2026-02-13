'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Languages,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  Coins,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import { canUseAI, getAILimit } from '@/lib/plan-utils'
import type { PlanId } from '@/lib/plans'

interface ScriptTranslatorProps {
  planId: PlanId
  aiUsageThisMonth: number
  creditsRemaining: number
}

const FREE_COUNT = 1

const TRANSLATION_TIERS = [
  { id: 'free', label: '1 Language', count: 1, freeLabel: 'Free' },
  { id: 'tier_5', label: '5 Languages', count: 5, price: '$10' },
  { id: 'tier_25', label: '25 Languages', count: 25, price: '$25' },
  { id: 'tier_50', label: '50 Languages', count: 50, price: '$50' },
  { id: 'tier_100', label: '100 Languages', count: 100, price: '$100' },
  { id: 'tier_all', label: 'All 175+', count: 9999, price: '$500', badge: 'Best Value' },
]

export function ScriptTranslator({ planId, aiUsageThisMonth, creditsRemaining }: ScriptTranslatorProps) {
  const router = useRouter()
  const [script, setScript] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set())
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({})
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedLang, setCopiedLang] = useState<string | null>(null)
  const [usageCount, setUsageCount] = useState(aiUsageThisMonth)
  const [credits, setCredits] = useState(creditsRemaining)
  const [langSearch, setLangSearch] = useState('')
  const [activeTier, setActiveTier] = useState<string | null>(null)
  const [showLanguageList, setShowLanguageList] = useState(false)
  const [expandedTranslation, setExpandedTranslation] = useState<string | null>(null)

  const aiLimit = getAILimit(planId)
  const limitReached = !canUseAI(planId, usageCount)

  // Available languages (excluding source)
  const availableLanguages = useMemo(
    () => SUPPORTED_LANGUAGES.filter((l) => l.code !== sourceLanguage),
    [sourceLanguage]
  )

  // Filtered for search
  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return availableLanguages
    const q = langSearch.toLowerCase()
    return availableLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    )
  }, [langSearch, availableLanguages])

  // Credit cost: first 5 free, 1 credit per additional language
  const creditCost = useMemo(
    () => Math.max(0, selectedLanguages.size - FREE_COUNT),
    [selectedLanguages.size]
  )

  const canAfford = creditCost === 0 || credits >= creditCost

  const sourceStats = useMemo(() => {
    const words = script.trim() ? script.trim().split(/\s+/).length : 0
    return { words, chars: script.length }
  }, [script])

  // Tier selection — auto-selects top N languages
  const handleTierSelect = useCallback(
    (tier: (typeof TRANSLATION_TIERS)[0]) => {
      const count = tier.count === 9999 ? availableLanguages.length : tier.count
      const langs = availableLanguages.slice(0, count)
      setSelectedLanguages(new Set(langs.map((l) => l.code)))
      setActiveTier(tier.id)
      setTranslations({})
      setTranslationErrors({})
    },
    [availableLanguages]
  )

  const handleToggleLanguage = useCallback((code: string) => {
    setSelectedLanguages((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
    setActiveTier(null)
    setTranslations({})
    setTranslationErrors({})
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedLanguages(new Set())
    setActiveTier(null)
    setTranslations({})
    setTranslationErrors({})
  }, [])

  async function handleTranslate() {
    if (!script.trim() || selectedLanguages.size === 0) return
    setIsTranslating(true)
    setError(null)
    setTranslations({})
    setTranslationErrors({})

    try {
      const targetLangs = Array.from(selectedLanguages).map((code) => {
        const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code)
        return lang?.name ?? code
      })
      const sourceLang = SUPPORTED_LANGUAGES.find((l) => l.code === sourceLanguage)

      const res = await fetch('/api/ai/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: script.trim(),
          source_language: sourceLang?.name ?? 'English',
          target_languages: targetLangs,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to translate')
        return
      }

      setTranslations(data.translations ?? {})
      setTranslationErrors(data.errors ?? {})
      if (data.credits_used > 0) {
        setCredits((c) => Math.max(0, c - data.credits_used))
      }
      setUsageCount((c) => c + 1)

      // Auto-expand first translation
      const firstLang = Object.keys(data.translations ?? {})[0]
      if (firstLang) setExpandedTranslation(firstLang)
    } catch {
      setError('Failed to translate. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  async function handleCopy(lang: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedLang(lang)
    setTimeout(() => setCopiedLang(null), 2000)
  }

  async function handleCopyAll() {
    const allText = Object.entries(translations)
      .map(([lang, text]) => `--- ${lang} ---\n${text}`)
      .join('\n\n')
    await navigator.clipboard.writeText(allText)
    setCopiedLang('__all__')
    setTimeout(() => setCopiedLang(null), 2000)
  }

  function handleUseInVideo(text: string) {
    sessionStorage.setItem('prefill-script', text)
    router.push('/dashboard')
  }

  // Compute credit cost per tier for display
  function tierCreditCost(count: number): number {
    const actual = count === 9999 ? availableLanguages.length : count
    return Math.max(0, actual - FREE_COUNT)
  }

  const translationCount = Object.keys(translations).length
  const errorCount = Object.keys(translationErrors).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Script Translator
        </CardTitle>
        <CardDescription>
          Translate your video scripts to 175+ languages — first language free, then 1
          credit per additional language
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Source language selector */}
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <select
            value={sourceLanguage}
            onChange={(e) => {
              setSourceLanguage(e.target.value)
              setSelectedLanguages((prev) => {
                const next = new Set(prev)
                next.delete(e.target.value)
                return next
              })
              setTranslations({})
            }}
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Translation Tiers */}
        <div className="space-y-2">
          <Label className="text-xs">
            Choose a tier or select languages manually
          </Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {TRANSLATION_TIERS.map((tier) => {
              const isActive = activeTier === tier.id
              const cost = tierCreditCost(tier.count)
              const affordable = cost === 0 || credits >= cost
              return (
                <button
                  key={tier.id}
                  onClick={() => handleTierSelect(tier)}
                  disabled={isTranslating}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm transition-all hover:shadow-md ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                      : 'border-border bg-background hover:border-primary/30'
                  }`}
                >
                  {tier.badge && (
                    <Badge className="absolute -top-2.5 text-[10px]">{tier.badge}</Badge>
                  )}
                  <span className="font-bold text-base">{tier.label}</span>
                  {tier.freeLabel ? (
                    <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                      {tier.freeLabel}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {cost} credits
                      {!affordable && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Credit Balance & Cost Preview */}
        {selectedLanguages.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {selectedLanguages.size} language{selectedLanguages.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Cost:{' '}
                <span className="font-semibold">
                  {creditCost === 0 ? (
                    <span className="text-green-600 dark:text-green-400">Free</span>
                  ) : (
                    `${creditCost} credits`
                  )}
                </span>
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-xs text-muted-foreground">
              Balance: {credits} credits
            </span>
            {creditCost > 0 && !canAfford && (
              <>
                <div className="h-4 w-px bg-border" />
                <Badge variant="destructive" className="text-[10px]">
                  Need {creditCost - credits} more credits
                </Badge>
              </>
            )}
            <button
              onClick={handleClearSelection}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}

        {/* Manual Language Selection (collapsible) */}
        <div className="space-y-2">
          <button
            onClick={() => setShowLanguageList(!showLanguageList)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showLanguageList ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {showLanguageList ? 'Hide' : 'Show'} individual language selection
            {selectedLanguages.size > 0 && !activeTier && (
              <Badge variant="secondary" className="text-[10px] ml-1">
                {selectedLanguages.size} custom
              </Badge>
            )}
          </button>

          {showLanguageList && (
            <div className="rounded-lg border p-3 space-y-2">
              <Input
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search languages..."
                className="h-8 text-xs"
              />
              <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                {filteredLanguages.map((lang) => (
                  <label
                    key={lang.code}
                    className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedLanguages.has(lang.code)
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLanguages.has(lang.code)}
                      onChange={() => handleToggleLanguage(lang.code)}
                      className="h-3 w-3 rounded border-muted-foreground/30"
                    />
                    <span className="truncate">{lang.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Script Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Script</Label>
            <span className="text-[10px] text-muted-foreground">
              {sourceStats.words} words · {sourceStats.chars}/5000 chars
            </span>
          </div>
          <Textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value)
              setTranslations({})
              setTranslationErrors({})
            }}
            rows={6}
            placeholder="Paste or type your script here..."
            maxLength={5000}
            className="resize-y text-sm"
          />
        </div>

        {/* Translate Button */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleTranslate}
            disabled={
              !script.trim() ||
              selectedLanguages.size === 0 ||
              isTranslating ||
              limitReached ||
              !canAfford
            }
            size="lg"
          >
            {isTranslating ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Translating to {selectedLanguages.size} languages...
              </>
            ) : (
              <>
                <Languages className="mr-1.5 h-4 w-4" />
                Translate to {selectedLanguages.size} language
                {selectedLanguages.size !== 1 ? 's' : ''}
                {creditCost > 0 && ` (${creditCost} credits)`}
              </>
            )}
          </Button>

          {translationCount > 1 && (
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              {copiedLang === '__all__' ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Copied All
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy All
                </>
              )}
            </Button>
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

        {/* Loading progress */}
        {isTranslating && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Translating to {selectedLanguages.size} languages...
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedLanguages.size <= 5
                  ? 'This should take a few seconds'
                  : selectedLanguages.size <= 25
                    ? 'This may take about a minute'
                    : 'This may take several minutes for large batches'}
              </p>
            </div>
          </div>
        )}

        {/* Translation Results */}
        {translationCount > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">
              Translations ({translationCount} completed
              {errorCount > 0 && `, ${errorCount} failed`})
            </Label>
            <div className="max-h-[500px] overflow-y-auto rounded-lg border divide-y">
              {Object.entries(translations).map(([lang, text]) => (
                <div key={lang}>
                  <button
                    onClick={() =>
                      setExpandedTranslation(expandedTranslation === lang ? null : lang)
                    }
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium">{lang}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {text.trim().split(/\s+/).length} words
                      </span>
                      {expandedTranslation === lang ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {expandedTranslation === lang && (
                    <div className="px-4 pb-3 space-y-2">
                      <div className="rounded-md bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                        {text}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(lang, text)}
                        >
                          {copiedLang === lang ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseInVideo(text)}
                        >
                          <ArrowRight className="mr-1 h-3 w-3" />
                          Use in Video
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {Object.entries(translationErrors).map(([lang, err]) => (
                <div
                  key={`err-${lang}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-destructive">{lang}</span>
                  <span className="text-xs text-destructive">{err}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
