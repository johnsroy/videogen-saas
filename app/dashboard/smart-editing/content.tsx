'use client'

import { useRef, useState } from 'react'
import { AiScriptStudio } from '@/components/dashboard/ai-script-studio'
import { CaptionGenerator } from '@/components/dashboard/caption-generator'
import { ScriptTemplates } from '@/components/dashboard/script-templates'
import { VideoRemixStudio } from '@/components/dashboard/video-remix-studio'
import type { PlanId } from '@/lib/plans'
import type { VideoRecord } from '@/lib/heygen-types'

interface SmartEditingContentProps {
  planId: PlanId
  aiUsageThisMonth: number
  videosThisMonth: number
  completedVideos: VideoRecord[]
}

export function SmartEditingContent({
  planId,
  aiUsageThisMonth,
  videosThisMonth,
  completedVideos,
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
      // Error will be visible in the template card's loading state ending
      console.error('Template generation error:', err)
    } finally {
      setIsGeneratingTemplate(false)
    }
  }

  return (
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

      {/* Row 2: Caption Generator + Video Remix Studio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CaptionGenerator completedVideos={completedVideos} />
        <VideoRemixStudio
          completedVideos={completedVideos}
          planId={planId}
          videosThisMonth={videosThisMonth}
        />
      </div>
    </div>
  )
}
