'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TextToVideoCreator } from '@/components/dashboard/studio/text-to-video-creator'
import { IngredientsStudio } from '@/components/dashboard/studio/ingredients-studio'
import { ShotDesigner } from '@/components/dashboard/studio/shot-designer'
import { SceneExtender } from '@/components/dashboard/studio/scene-extender'
import { BatchVariations } from '@/components/dashboard/studio/batch-variations'
import { StudioGallery } from '@/components/dashboard/studio/studio-gallery'
import { CreditCostPreview } from '@/components/dashboard/studio/credit-cost-preview'
import { AudioDirector } from '@/components/dashboard/studio/audio-director'
import { StylePresets, type StylePreset, STYLE_PRESETS } from '@/components/dashboard/studio/style-presets'
import { Video, Beaker, Clapperboard, Maximize2, Layers, Film, ArrowUpRight } from 'lucide-react'
import type { PlanId } from '@/lib/plans'
import Link from 'next/link'

interface StudioContentProps {
  planId: PlanId
  hasFullAccess: boolean
  creditsRemaining?: number
  creditsTotal?: number
}

export function UGCContent({ planId, hasFullAccess, creditsRemaining = 0, creditsTotal = 0 }: StudioContentProps) {
  const [activeTab, setActiveTab] = useState('text-to-video')
  const [credits, setCredits] = useState({ remaining: creditsRemaining, total: creditsTotal })

  // Sidebar state — shared across all creation tabs
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(STYLE_PRESETS[0])
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [audioDirection, setAudioDirection] = useState('')

  // Fetch credits if not provided
  useEffect(() => {
    if (creditsRemaining === 0 && creditsTotal === 0) {
      fetch('/api/credits/balance')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) setCredits({ remaining: data.remaining, total: data.total })
        })
        .catch(() => {})
    }
  }, [creditsRemaining, creditsTotal])

  function handleVideoCreated(video: Record<string, unknown>) {
    // Dispatch event for gallery updates
    window.dispatchEvent(new CustomEvent('video-created', { detail: video }))
    // Reduce displayed credits
    const cost = (video as { credits_used?: number }).credits_used ?? 0
    setCredits((prev) => ({ ...prev, remaining: Math.max(0, prev.remaining - cost) }))
  }

  if (!hasFullAccess) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Film className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Video Studio</h2>
              <p className="mt-1 text-muted-foreground">
                Powered by Google Veo 3.1 — Create stunning videos from text, images, or both.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left text-sm">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                Text to Video
              </div>
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-primary" />
                Ingredients Studio
              </div>
              <div className="flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-primary" />
                Shot Designer
              </div>
              <div className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-primary" />
                Scene Extender
              </div>
            </div>
            <Button asChild size="lg" className="mt-2">
              <Link href="/#pricing">
                Upgrade to Creator
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Starting at $60/month with 50 AI Video credits
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      {/* Main content area */}
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="text-to-video" className="gap-1.5 text-xs">
              <Video className="h-3.5 w-3.5" />
              Text to Video
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="gap-1.5 text-xs">
              <Beaker className="h-3.5 w-3.5" />
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="shot-designer" className="gap-1.5 text-xs">
              <Clapperboard className="h-3.5 w-3.5" />
              Shot Designer
            </TabsTrigger>
            <TabsTrigger value="scene-extender" className="gap-1.5 text-xs">
              <Maximize2 className="h-3.5 w-3.5" />
              Scene Extender
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" />
              Batch Create
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-1.5 text-xs">
              <Film className="h-3.5 w-3.5" />
              My Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text-to-video" className="mt-4">
            <TextToVideoCreator
              stylePrefix={selectedStyle.promptPrefix}
              negativePromptDefault={selectedStyle.negativePrompt}
              audioEnabled={audioEnabled}
              audioDirection={audioDirection}
              onVideoCreated={handleVideoCreated}
            />
          </TabsContent>

          <TabsContent value="ingredients" className="mt-4">
            <IngredientsStudio
              stylePrefix={selectedStyle.promptPrefix}
              audioEnabled={audioEnabled}
              audioDirection={audioDirection}
              onVideoCreated={handleVideoCreated}
            />
          </TabsContent>

          <TabsContent value="shot-designer" className="mt-4">
            <ShotDesigner
              stylePrefix={selectedStyle.promptPrefix}
              audioEnabled={audioEnabled}
              audioDirection={audioDirection}
              onVideoCreated={handleVideoCreated}
              creditsRemaining={credits.remaining}
            />
          </TabsContent>

          <TabsContent value="scene-extender" className="mt-4">
            <SceneExtender onVideoCreated={handleVideoCreated} />
          </TabsContent>

          <TabsContent value="batch" className="mt-4">
            <BatchVariations
              stylePrefix={selectedStyle.promptPrefix}
              audioEnabled={audioEnabled}
              audioDirection={audioDirection}
              onVideoCreated={handleVideoCreated}
            />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <StudioGallery
              onExtendVideo={() => setActiveTab('scene-extender')}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar controls */}
      <div className="space-y-4">
        <CreditCostPreview
          creditsRemaining={credits.remaining}
        />
        <StylePresets
          value={selectedStyle.id}
          onChange={setSelectedStyle}
        />
        <AudioDirector
          audioEnabled={audioEnabled}
          onAudioEnabledChange={setAudioEnabled}
          audioDirection={audioDirection}
          onAudioDirectionChange={setAudioDirection}
        />
      </div>
    </div>
  )
}
