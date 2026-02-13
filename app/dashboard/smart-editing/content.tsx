'use client'

import { useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Film } from 'lucide-react'
import { AiScriptStudio } from '@/components/dashboard/ai-script-studio'
import { CaptionGenerator } from '@/components/dashboard/caption-generator'
import { ScriptTemplates } from '@/components/dashboard/script-templates'
import { VideoEditorHub } from '@/components/dashboard/video-editor-hub'
import type { PlanId } from '@/lib/plans'
import type { VideoRecord } from '@/lib/heygen-types'

interface SmartEditingContentProps {
  planId: PlanId
  aiUsageThisMonth: number
  videosThisMonth: number
  completedVideos: VideoRecord[]
  creditsRemaining: number
}

export function SmartEditingContent({
  planId,
  aiUsageThisMonth,
  videosThisMonth,
  completedVideos,
  creditsRemaining,
}: SmartEditingContentProps) {
  const studioRef = useRef<HTMLDivElement>(null)
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false)

  function setStudioScript(script: string) {
    const setter = (window as unknown as Record<string, unknown>).__setStudioScript
    if (typeof setter === 'function') {
      ;(setter as (s: string) => void)(script)
    }
    studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleTemplateSelect(script: string) {
    setStudioScript(script)
  }

  async function handleGenerateFromTemplate(
    templateId: string,
    options: { product?: string; audience?: string; tone?: string }
  ) {
    setIsGeneratingTemplate(true)
    try {
      const res = await fetch('/api/ai/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          product_name: options.product,
          audience: options.audience,
          tone: options.tone,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate from template')
      }
      setStudioScript(data.script)
    } catch (err) {
      console.error('Template generation error:', err)
    } finally {
      setIsGeneratingTemplate(false)
    }
  }

  return (
    <Tabs defaultValue="scripts">
      <TabsList>
        <TabsTrigger value="scripts" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Scripts
        </TabsTrigger>
        <TabsTrigger value="editor" className="gap-1.5">
          <Film className="h-3.5 w-3.5" />
          Video Editor
        </TabsTrigger>
      </TabsList>

      <TabsContent value="scripts" className="mt-4">
        <div className="space-y-6">
          {/* Row 1: AI Script Studio + Script Templates */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div ref={studioRef}>
              <AiScriptStudio
                planId={planId}
                aiUsageThisMonth={aiUsageThisMonth}
              />
            </div>
            <ScriptTemplates
              onSelectTemplate={handleTemplateSelect}
              onGenerateFromTemplate={handleGenerateFromTemplate}
              isGeneratingTemplate={isGeneratingTemplate}
            />
          </div>

          {/* Row 2: Caption Generator */}
          <CaptionGenerator completedVideos={completedVideos} />
        </div>
      </TabsContent>

      <TabsContent value="editor" className="mt-4">
        <VideoEditorHub
          completedVideos={completedVideos}
          planId={planId}
          videosThisMonth={videosThisMonth}
          creditsRemaining={creditsRemaining}
        />
      </TabsContent>
    </Tabs>
  )
}
