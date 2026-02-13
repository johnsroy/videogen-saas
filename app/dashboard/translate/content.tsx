'use client'

import { ScriptTranslator } from '@/components/dashboard/script-translator'
import { MultilingualVideoCreator } from '@/components/dashboard/multilingual-video-creator'
import { CaptionTranslator } from '@/components/dashboard/caption-translator'
import type { PlanId } from '@/lib/plans'
import type { VideoRecord } from '@/lib/heygen-types'

interface TranslateContentProps {
  planId: PlanId
  aiUsageThisMonth: number
  videosThisMonth: number
  completedVideos: VideoRecord[]
  creditsRemaining: number
}

export function TranslateContent({
  planId,
  aiUsageThisMonth,
  videosThisMonth,
  completedVideos,
  creditsRemaining,
}: TranslateContentProps) {
  return (
    <div className="space-y-6">
      {/* Row 1: Script Translator (full width) */}
      <ScriptTranslator
        planId={planId}
        aiUsageThisMonth={aiUsageThisMonth}
        creditsRemaining={creditsRemaining}
      />

      {/* Row 2: Multi-Language Video Creator + Caption Translator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MultilingualVideoCreator
          planId={planId}
          aiUsageThisMonth={aiUsageThisMonth}
          videosThisMonth={videosThisMonth}
        />
        <CaptionTranslator
          completedVideos={completedVideos}
          planId={planId}
          aiUsageThisMonth={aiUsageThisMonth}
        />
      </div>
    </div>
  )
}
