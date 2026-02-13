'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sparkles, Wand2, ChevronDown, ChevronRight, Loader2, Check, X, Copy,
  ArrowRight, RefreshCw, Undo2, Redo2,
} from 'lucide-react'
import { ENHANCEMENT_LABELS, TONE_OPTIONS, DURATION_OPTIONS } from '@/lib/ai-prompts'
import { canUseAI, getAILimit } from '@/lib/plan-utils'
import type { PlanId } from '@/lib/plans'

interface AiScriptStudioProps {
  planId: PlanId
  aiUsageThisMonth: number
}

export function AiScriptStudio({ planId, aiUsageThisMonth }: AiScriptStudioProps) {
  const router = useRouter()

  // Generation settings
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<string>('')
  const [duration, setDuration] = useState(60)
  const [audience, setAudience] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Script state
  const [script, setScript] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancedScript, setEnhancedScript] = useState<string | null>(null)
  const [enhanceAction, setEnhanceAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [usageCount, setUsageCount] = useState(aiUsageThisMonth)

  // History (undo/redo)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Track last generation settings for Regenerate
  const [lastTopic, setLastTopic] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)

  const aiLimit = getAILimit(planId)
  const limitReached = !canUseAI(planId, usageCount)

  // Script stats
  const stats = useMemo(() => {
    const words = script.trim() ? script.trim().split(/\s+/).length : 0
    const estimatedSeconds = Math.round((words / 150) * 60)
    return { words, chars: script.length, estimatedSeconds }
  }, [script])

  function pushToHistory(text: string) {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(text)
    // Keep max 10 entries
    if (newHistory.length > 10) newHistory.shift()
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  function handleUndo() {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    setScript(history[newIndex])
  }

  function handleRedo() {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    setScript(history[newIndex])
  }

  async function handleGenerate(regenerate = false) {
    const currentTopic = regenerate ? lastTopic : topic.trim()
    if (!currentTopic) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentTopic,
          duration_seconds: duration,
          tone: tone || undefined,
          audience: audience.trim() || undefined,
          custom_instructions: customInstructions.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate script')
        return
      }
      setScript(data.script)
      pushToHistory(data.script)
      setUsageCount((c) => c + 1)
      setLastTopic(currentTopic)
      setHasGenerated(true)
      if (!regenerate) setTopic('')
    } catch {
      setError('Failed to generate script')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleEnhance(action: string) {
    if (!script.trim()) return
    setIsEnhancing(true)
    setEnhanceAction(action)
    setError(null)
    setEnhancedScript(null)
    try {
      const res = await fetch('/api/ai/enhance-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to enhance script')
        return
      }
      setEnhancedScript(data.enhanced_script)
      setUsageCount((c) => c + 1)
    } catch {
      setError('Failed to enhance script')
    } finally {
      setIsEnhancing(false)
    }
  }

  function acceptEnhancement() {
    if (enhancedScript) {
      setScript(enhancedScript)
      pushToHistory(enhancedScript)
      setEnhancedScript(null)
      setEnhanceAction(null)
    }
  }

  function rejectEnhancement() {
    setEnhancedScript(null)
    setEnhanceAction(null)
  }

  async function handleCopy() {
    if (!script) return
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleUseInVideo() {
    sessionStorage.setItem('prefill-script', script)
    router.push('/dashboard')
  }

  // Allow setting script from template or external source
  const handleSetScript = useCallback((text: string) => {
    setScript(text)
    pushToHistory(text)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, historyIndex])

  // Expose setter for parent (template selection)
  if (typeof window !== 'undefined') {
    ;(window as unknown as Record<string, unknown>).__setStudioScript = handleSetScript
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Script Studio
        </CardTitle>
        <CardDescription>
          Generate scripts from a topic, customize settings, and refine with AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate from topic */}
        <div className="space-y-2">
          <Label>Generate from Topic</Label>
          <div className="flex gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Benefits of remote work for small businesses"
              maxLength={500}
              onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
              disabled={limitReached || isGenerating || isEnhancing}
            />
            <Button
              onClick={() => handleGenerate()}
              disabled={!topic.trim() || isGenerating || limitReached}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Settings panel */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Tone */}
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

            {/* Duration */}
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

          {/* Audience */}
          <div className="space-y-1.5">
            <Label className="text-xs">Target Audience</Label>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. startup founders, college students, HR managers"
              maxLength={200}
              className="h-8 text-xs"
            />
          </div>

          {/* Custom instructions (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Custom instructions
            </button>
            {showAdvanced && (
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Mention our product name 'Acme', include a statistic about productivity, add humor"
                maxLength={500}
                rows={2}
                className="mt-1.5 text-xs resize-none"
              />
            )}
          </div>
        </div>

        {/* Script textarea with history nav */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="studio-script">Script</Label>
              {history.length > 1 && (
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {historyIndex + 1}/{history.length}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{stats.chars} chars</span>
          </div>
          <Textarea
            id="studio-script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={8}
            placeholder="Type or generate a script..."
            className="resize-y"
          />
          {/* Stats bar */}
          {script.trim() && (
            <p className="text-xs text-muted-foreground">
              {stats.words} words · ~{stats.estimatedSeconds}s speaking time
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!script.trim() || limitReached || isGenerating || isEnhancing}
              >
                {isEnhancing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Enhance
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {Object.entries(ENHANCEMENT_LABELS).map(([key, label]) => (
                <DropdownMenuItem key={key} onClick={() => handleEnhance(key)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasGenerated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(true)}
              disabled={isGenerating || isEnhancing || limitReached}
            >
              {isGenerating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Regenerate
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!script.trim()}
          >
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

          <Button
            size="sm"
            onClick={handleUseInVideo}
            disabled={!script.trim()}
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            Use in Video
          </Button>

          {aiLimit !== null && (
            <span className="text-xs text-muted-foreground ml-auto">
              {usageCount} / {aiLimit} AI uses
            </span>
          )}
        </div>

        {/* Enhancement preview */}
        {enhancedScript && (
          <div className="rounded-md border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {enhanceAction && ENHANCEMENT_LABELS[enhanceAction]} — Preview
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={acceptEnhancement}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Accept
                </Button>
                <Button size="sm" variant="ghost" onClick={rejectEnhancement}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">{enhancedScript}</p>
          </div>
        )}

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
