'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Clock, ChevronRight, Sparkles, Loader2, Eye, EyeOff } from 'lucide-react'
import { scriptTemplates, TEMPLATE_CATEGORIES, type ScriptTemplate } from '@/lib/script-templates'
import { TONE_OPTIONS } from '@/lib/ai-prompts'
import { cn } from '@/lib/utils'

interface ScriptTemplatesProps {
  onSelectTemplate: (script: string) => void
  onGenerateFromTemplate: (templateId: string, options: { product?: string; audience?: string; tone?: string }) => Promise<void>
  isGeneratingTemplate: boolean
}

export function ScriptTemplates({ onSelectTemplate, onGenerateFromTemplate, isGeneratingTemplate }: ScriptTemplatesProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = Object.entries(TEMPLATE_CATEGORIES)
  const filtered =
    activeCategory === 'all'
      ? scriptTemplates
      : scriptTemplates.filter((t) => t.category === activeCategory)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Script Templates
        </CardTitle>
        <CardDescription>
          Use as-is or customize with AI to generate a personalized script
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category filter — pill-style tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              activeCategory === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {categories.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                activeCategory === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="space-y-3">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUseAsIs={() => onSelectTemplate(template.script)}
              onGenerate={onGenerateFromTemplate}
              isGeneratingTemplate={isGeneratingTemplate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TemplateCard({
  template,
  onUseAsIs,
  onGenerate,
  isGeneratingTemplate,
}: {
  template: ScriptTemplate
  onUseAsIs: () => void
  onGenerate: (templateId: string, options: { product?: string; audience?: string; tone?: string }) => Promise<void>
  isGeneratingTemplate: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [product, setProduct] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleCustomGenerate() {
    setIsGenerating(true)
    try {
      await onGenerate(template.id, {
        product: product.trim() || undefined,
        audience: audience.trim() || undefined,
        tone: tone || undefined,
      })
      setShowCustomize(false)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="group rounded-lg border p-3 transition-all hover:border-foreground/20 hover:shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium">{template.title}</h4>
            <Badge variant="secondary" className="text-[10px]">
              {TEMPLATE_CATEGORIES[template.category]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 pt-0.5">
          <Clock className="h-3 w-3" />
          {template.estimatedDuration}
        </div>
      </div>

      {/* Preview toggle */}
      {!showCustomize && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <EyeOff className="h-3 w-3" />
              Hide preview
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              Preview script
            </>
          )}
        </button>
      )}

      {/* Script preview */}
      {expanded && !showCustomize && (
        <div className="mt-2 max-h-28 overflow-y-auto rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {template.script}
        </div>
      )}

      {/* Customize form */}
      {showCustomize && (
        <div className="mt-3 space-y-2.5 rounded-md border bg-muted/20 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Product / Topic</Label>
            <Input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. My SaaS tool, Organic coffee brand"
              maxLength={200}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target Audience</Label>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Startup founders, Fitness enthusiasts"
              maxLength={200}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TONE_OPTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleCustomGenerate}
              disabled={isGenerating || isGeneratingTemplate}
              className="text-xs flex-1"
            >
              {isGenerating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Generate Script
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomize(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showCustomize && (
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUseAsIs}
            className="text-xs flex-1"
          >
            Use As-Is
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={() => { setShowCustomize(true); setExpanded(false) }}
            className="text-xs flex-1"
            disabled={isGeneratingTemplate}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Customize
          </Button>
        </div>
      )}
    </div>
  )
}
