'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sparkles, Wand2, ChevronDown, Loader2, Check, X } from 'lucide-react'
import { ENHANCEMENT_LABELS } from '@/lib/ai-prompts'

interface ScriptAiToolsProps {
  currentScript: string
  onScriptChange: (script: string) => void
  isProPlan: boolean
  aiUsageThisMonth: number
}

export function ScriptAiTools({ currentScript, onScriptChange, isProPlan, aiUsageThisMonth }: ScriptAiToolsProps) {
  const [showGenerator, setShowGenerator] = useState(false)
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancedScript, setEnhancedScript] = useState<string | null>(null)
  const [enhanceAction, setEnhanceAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const limitReached = !isProPlan && aiUsageThisMonth >= 10

  async function handleGenerate() {
    if (!topic.trim()) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), duration_seconds: 60 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate script')
        return
      }
      onScriptChange(data.script)
      setTopic('')
      setShowGenerator(false)
    } catch {
      setError('Failed to generate script')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleEnhance(action: string) {
    if (!currentScript.trim()) return
    setIsEnhancing(true)
    setEnhanceAction(action)
    setError(null)
    setEnhancedScript(null)
    try {
      const res = await fetch('/api/ai/enhance-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: currentScript, action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to enhance script')
        return
      }
      setEnhancedScript(data.enhanced_script)
    } catch {
      setError('Failed to enhance script')
    } finally {
      setIsEnhancing(false)
    }
  }

  function acceptEnhancement() {
    if (enhancedScript) {
      onScriptChange(enhancedScript)
      setEnhancedScript(null)
      setEnhanceAction(null)
    }
  }

  function rejectEnhancement() {
    setEnhancedScript(null)
    setEnhanceAction(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowGenerator(!showGenerator)}
          disabled={limitReached || isGenerating || isEnhancing}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          AI Generate
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!currentScript.trim() || limitReached || isGenerating || isEnhancing}
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

        {!isProPlan && (
          <span className="text-xs text-muted-foreground">
            {aiUsageThisMonth} / 10 AI uses
          </span>
        )}
      </div>

      {showGenerator && (
        <div className="flex gap-2">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe your video topic..."
            maxLength={500}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
          </Button>
        </div>
      )}

      {enhancedScript && (
        <div className="rounded-md border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {enhanceAction && ENHANCEMENT_LABELS[enhanceAction]} — Preview:
            </p>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={acceptEnhancement}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Accept
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={rejectEnhancement}>
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">{enhancedScript}</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {limitReached && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          AI limit reached (10/month). Upgrade to Pro for unlimited.
        </p>
      )}
    </div>
  )
}
