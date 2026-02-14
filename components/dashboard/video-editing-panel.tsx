'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mic, Captions, Music, Sparkles } from 'lucide-react'
import { AiVoiceoverStudio } from './ai-voiceover-studio'
import { EnhancedCaptionEditor } from './enhanced-caption-editor'
import { BackgroundMusicMixer } from './background-music-mixer'
import { VideoRemixStudio } from './video-remix-studio'
import { VolumeMixer } from './volume-mixer'
import { ExportBar } from './export-bar'
import { EXPORT_CREDIT_COST } from '@/lib/credits'
import type { VideoRecord } from '@/lib/heygen-types'
import type { PlanId } from '@/lib/plans'

interface EditProjectState {
  id: string | null
  voiceoverId: string | null
  voiceoverUrl: string | null
  captionContent: string | null
  captionStyles: Record<string, string>
  musicSelection: { type: 'preset' | 'ai'; id: string } | null
  musicUrl: string | null
  voiceoverVolume: number
  musicVolume: number
  originalAudioVolume: number
  isDirty: boolean
  status: 'draft' | 'exporting' | 'completed' | 'failed'
  exportError: string | null
  exportedVideoUrl: string | null
}

const DEFAULT_PROJECT: EditProjectState = {
  id: null,
  voiceoverId: null,
  voiceoverUrl: null,
  captionContent: null,
  captionStyles: {},
  musicSelection: null,
  musicUrl: null,
  voiceoverVolume: 100,
  musicVolume: 30,
  originalAudioVolume: 100,
  isDirty: false,
  status: 'draft',
  exportError: null,
  exportedVideoUrl: null,
}

interface VideoEditingPanelProps {
  video: VideoRecord
  planId: PlanId
  videosThisMonth: number
  creditsRemaining: number
}

export function VideoEditingPanel({
  video,
  planId,
  videosThisMonth,
  creditsRemaining,
}: VideoEditingPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [project, setProject] = useState<EditProjectState>(DEFAULT_PROJECT)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [credits, setCredits] = useState(creditsRemaining)

  function handleVideoRef(el: HTMLVideoElement | null) {
    videoRef.current = el
    setVideoElement(el)
  }

  // Load existing project when video changes
  useEffect(() => {
    setProject(DEFAULT_PROJECT)
    setLoadError(null)
    setSaveError(null)
    fetch(`/api/editor/load?source_video_id=${video.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load project')
        return r.json()
      })
      .then((data) => {
        if (data.project) {
          const p = data.project
          setProject({
            id: p.id,
            voiceoverId: p.voiceover_id,
            voiceoverUrl: p.voiceover?.audio_url || null,
            captionContent: p.caption_content,
            captionStyles: p.caption_styles || {},
            musicSelection: p.music_ai_id
              ? { type: 'ai', id: p.music_ai_id }
              : p.music_preset_id
                ? { type: 'preset', id: p.music_preset_id }
                : null,
            musicUrl: p.ai_music?.audio_url || null,
            voiceoverVolume: p.voiceover_volume ?? 100,
            musicVolume: p.music_volume ?? 30,
            originalAudioVolume: p.original_audio_volume ?? 100,
            isDirty: false,
            status: p.status || 'draft',
            exportError: p.error_message || null,
            exportedVideoUrl: null,
          })
        }
      })
      .catch(() => {
        setLoadError('Failed to load saved project. Your edits may not be recovered.')
      })
  }, [video.id])

  // Helper: mark project dirty and reset completed status so user knows to re-export
  function markDirty(updates: Partial<EditProjectState>): (prev: EditProjectState) => EditProjectState {
    return (p) => ({
      ...p,
      ...updates,
      isDirty: true,
      status: p.status === 'completed' ? 'draft' : p.status,
      exportedVideoUrl: p.status === 'completed' ? null : p.exportedVideoUrl,
    })
  }

  const handleVoiceoverGenerated = useCallback((voiceoverId: string, audioUrl: string) => {
    setProject(markDirty({ voiceoverId, voiceoverUrl: audioUrl }))
  }, [])

  const handleCaptionSaved = useCallback((captionContent: string, styles: Record<string, string>) => {
    setProject(markDirty({ captionContent, captionStyles: styles }))
  }, [])

  const handleTrackSelected = useCallback((selection: { type: 'preset' | 'ai'; id: string; url?: string } | null) => {
    setProject(markDirty({
      musicSelection: selection ? { type: selection.type, id: selection.id } : null,
      musicUrl: selection?.url || null,
    }))
  }, [])

  async function handleSave(): Promise<string | null> {
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_video_id: video.id,
          title: video.title,
          voiceover_id: project.voiceoverId,
          voiceover_volume: project.voiceoverVolume,
          caption_content: project.captionContent,
          caption_styles: project.captionStyles,
          music_preset_id: project.musicSelection?.type === 'preset' ? project.musicSelection.id : null,
          music_ai_id: project.musicSelection?.type === 'ai' ? project.musicSelection.id : null,
          music_volume: project.musicVolume,
          original_audio_volume: project.originalAudioVolume,
        }),
      })
      const data = await res.json()
      if (res.ok && data.project) {
        setProject((p) => ({ ...p, id: data.project.id, isDirty: false }))
        return data.project.id
      }
      setSaveError(data.error || 'Failed to save project')
      return null
    } catch {
      setSaveError('Failed to save project. Please try again.')
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExport() {
    // Save first if dirty — get the project ID directly from the save response
    let projectId = project.id
    if (project.isDirty || !projectId) {
      const savedId = await handleSave()
      if (!savedId) {
        setProject((p) => ({
          ...p,
          status: 'failed',
          exportError: 'Please save the project first',
        }))
        return
      }
      projectId = savedId
    }

    setIsExporting(true)
    setProject((p) => ({ ...p, status: 'exporting', exportError: null }))

    try {
      const res = await fetch('/api/editor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Export failed')
      }

      setProject((p) => ({
        ...p,
        status: 'completed',
        exportedVideoUrl: data.video?.video_url || null,
      }))
      setCredits((c) => Math.max(0, c - EXPORT_CREDIT_COST))

      // Dispatch event so gallery picks up the new video
      if (data.video) {
        window.dispatchEvent(new CustomEvent('video-created', { detail: data.video }))
      }
    } catch (err) {
      setProject((p) => ({
        ...p,
        status: 'failed',
        exportError: err instanceof Error ? err.message : 'Export failed',
      }))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Left: Video Preview + Volume Mixer */}
      <div className="lg:col-span-2 space-y-2">
        <div className="rounded-lg overflow-hidden border bg-black">
          {video.video_url ? (
            <video
              ref={handleVideoRef}
              src={video.video_url}
              controls
              className="w-full aspect-video"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Video not available</p>
            </div>
          )}
        </div>
        <div className="px-1">
          <p className="text-sm font-medium truncate">{video.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {video.prompt || video.script || 'No description'}
          </p>
        </div>

        {/* Volume Mixer */}
        <VolumeMixer
          originalVolume={project.originalAudioVolume}
          voiceoverVolume={project.voiceoverVolume}
          musicVolume={project.musicVolume}
          hasVoiceover={!!project.voiceoverId}
          hasMusic={!!project.musicSelection}
          onOriginalChange={(v) => setProject(markDirty({ originalAudioVolume: v }))}
          onVoiceoverChange={(v) => setProject(markDirty({ voiceoverVolume: v }))}
          onMusicChange={(v) => setProject(markDirty({ musicVolume: v }))}
        />

        {/* Errors */}
        {loadError && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 px-1">{loadError}</p>
        )}
        {saveError && (
          <p className="text-xs text-destructive px-1">{saveError}</p>
        )}

        {/* Export Bar */}
        <ExportBar
          isDirty={project.isDirty}
          isSaving={isSaving}
          isExporting={isExporting}
          exportStatus={project.status}
          exportError={project.exportError}
          exportedVideoUrl={project.exportedVideoUrl}
          creditsRemaining={credits}
          exportCost={EXPORT_CREDIT_COST}
          onSave={handleSave}
          onExport={handleExport}
        />
      </div>

      {/* Right: Tool Tabs */}
      <div className="lg:col-span-3">
        <Tabs defaultValue="voiceover">
          <TabsList className="w-full">
            <TabsTrigger value="voiceover" className="gap-1.5 text-xs">
              <Mic className="h-3.5 w-3.5" />
              Voiceover
            </TabsTrigger>
            <TabsTrigger value="captions" className="gap-1.5 text-xs">
              <Captions className="h-3.5 w-3.5" />
              Captions
            </TabsTrigger>
            <TabsTrigger value="music" className="gap-1.5 text-xs">
              <Music className="h-3.5 w-3.5" />
              Music
            </TabsTrigger>
            <TabsTrigger value="remix" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Remix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voiceover" className="mt-3">
            <AiVoiceoverStudio
              video={video}
              videoElement={videoElement}
              creditsRemaining={credits}
              onVoiceoverGenerated={handleVoiceoverGenerated}
            />
          </TabsContent>

          <TabsContent value="captions" className="mt-3">
            <EnhancedCaptionEditor
              video={video}
              videoElement={videoElement}
              onCaptionSaved={handleCaptionSaved}
            />
          </TabsContent>

          <TabsContent value="music" className="mt-3">
            <BackgroundMusicMixer
              videoElement={videoElement}
              creditsRemaining={credits}
              onTrackSelected={handleTrackSelected}
              onVolumeChanged={(v) => setProject(markDirty({ musicVolume: v }))}
              onCreditsChanged={(c) => setCredits(c)}
            />
          </TabsContent>

          <TabsContent value="remix" className="mt-3">
            <VideoRemixStudio
              video={video}
              planId={planId}
              videosThisMonth={videosThisMonth}
              creditsRemaining={credits}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
