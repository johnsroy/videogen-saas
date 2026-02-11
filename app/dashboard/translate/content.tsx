'use client'

import { ScriptTranslator } from '@/components/dashboard/script-translator'
import { MultilingualVideoCreator } from '@/components/dashboard/multilingual-video-creator'
import { CaptionTranslator } from '@/components/dashboard/caption-translator'
import type { VideoRecord } from '@/lib/heygen-types'

interface TranslateContentProps {
  isProPlan: boolean
  aiUsageThisMonth: number
  videosThisMonth: number
  completedVideos: VideoRecord[]
}

export function TranslateContent({
  isProPlan,
  aiUsageThisMonth,
  videosThisMonth,
  completedVideos,
}: TranslateContentProps) {
  return (
    <div className="space-y-6">
      {/* Row 1: Script Translator (full width) */}
      <ScriptTranslator
        isProPlan={isProPlan}
        aiUsageThisMonth={aiUsageThisMonth}
      />

      {/* Row 2: Multi-Language Video Creator + Caption Translator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MultilingualVideoCreator
          isProPlan={isProPlan}
          aiUsageThisMonth={aiUsageThisMonth}
          videosThisMonth={videosThisMonth}
        />
        <CaptionTranslator
          completedVideos={completedVideos}
          isProPlan={isProPlan}
          aiUsageThisMonth={aiUsageThisMonth}
        />
      </div>
    </div>
  )
}
