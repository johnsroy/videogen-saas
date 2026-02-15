'use client'

import { useState, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Package,
  Coffee,
  Shirt,
  UtensilsCrossed,
  Smartphone,
  Plane,
  Briefcase,
  Megaphone,
  Camera,
  Gift,
  Clapperboard,
  Star,
  Sparkles,
  ArrowLeft,
  Monitor,
  Play,
} from 'lucide-react'
import { TEMPLATE_CATEGORIES, DURATION_TIER_LABELS, SHOT_TEMPLATES } from '@/lib/shot-templates'
import type { ShotTemplate, TemplateCategory, TemplateDurationTier } from '@/lib/veo-types'

interface TemplateBrowserProps {
  onSelectTemplate: (template: ShotTemplate) => void
  onCustomShot: () => void
  onBack: () => void
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Package: <Package className="h-4 w-4" />,
  Coffee: <Coffee className="h-4 w-4" />,
  Shirt: <Shirt className="h-4 w-4" />,
  UtensilsCrossed: <UtensilsCrossed className="h-4 w-4" />,
  Smartphone: <Smartphone className="h-4 w-4" />,
  Plane: <Plane className="h-4 w-4" />,
  Briefcase: <Briefcase className="h-4 w-4" />,
  Megaphone: <Megaphone className="h-4 w-4" />,
  Camera: <Camera className="h-4 w-4" />,
  Gift: <Gift className="h-4 w-4" />,
}

function getCategoryIcon(iconName: string): React.ReactNode {
  return CATEGORY_ICONS[iconName] ?? <Package className="h-4 w-4" />
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`
}

// ── Animated preview keyframes ──
const PREVIEW_KEYFRAMES = `
@keyframes tpl-gradient {
  0% { background-position: 0% 50%; filter: hue-rotate(0deg) brightness(1); }
  33% { background-position: 100% 50%; filter: hue-rotate(25deg) brightness(1.3); }
  66% { background-position: 50% 100%; filter: hue-rotate(-15deg) brightness(0.9); }
  100% { background-position: 0% 50%; filter: hue-rotate(0deg) brightness(1); }
}
@keyframes tpl-pan-right {
  0% { transform: translateX(0) scale(1.3); }
  100% { transform: translateX(-15%) scale(1.3); }
}
@keyframes tpl-pan-left {
  0% { transform: translateX(0) scale(1.3); }
  100% { transform: translateX(15%) scale(1.3); }
}
@keyframes tpl-zoom-in {
  0% { transform: scale(1.1); }
  100% { transform: scale(1.5); }
}
@keyframes tpl-zoom-out {
  0% { transform: scale(1.5); }
  100% { transform: scale(1.1); }
}
@keyframes tpl-tilt-up {
  0% { transform: translateY(0) scale(1.3); }
  100% { transform: translateY(10%) scale(1.3); }
}
@keyframes tpl-orbit {
  0% { transform: scale(1.2) rotate(0deg); }
  50% { transform: scale(1.35) rotate(3deg); }
  100% { transform: scale(1.2) rotate(-3deg); }
}
@keyframes tpl-dolly {
  0% { transform: scale(1.1) translateY(5%); }
  50% { transform: scale(1.4) translateY(-3%); }
  100% { transform: scale(1.1) translateY(5%); }
}
@keyframes tpl-progress {
  0% { width: 0%; }
  100% { width: 100%; }
}
@keyframes tpl-text-in {
  0% { opacity: 0; transform: translateY(8px); }
  15% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-4px); }
}
@keyframes tpl-scanline {
  0% { top: -10%; }
  100% { top: 110%; }
}
@keyframes tpl-viewfinder {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@keyframes tpl-scene-counter {
  0%, 100% { opacity: 0; transform: scale(0.8); }
  10%, 90% { opacity: 1; transform: scale(1); }
}
`

/** Map camera movement text to a CSS animation name */
function getCameraAnimation(movement: string): string {
  const m = movement.toLowerCase()
  if (m.includes('pan') && m.includes('right')) return 'tpl-pan-right'
  if (m.includes('pan') && m.includes('left')) return 'tpl-pan-left'
  if (m.includes('zoom') && m.includes('in')) return 'tpl-zoom-in'
  if (m.includes('zoom') && m.includes('out')) return 'tpl-zoom-out'
  if (m.includes('tilt') || m.includes('crane')) return 'tpl-tilt-up'
  if (m.includes('orbit') || m.includes('arc') || m.includes('rotate')) return 'tpl-orbit'
  if (m.includes('dolly') || m.includes('tracking') || m.includes('push')) return 'tpl-dolly'
  if (m.includes('pull')) return 'tpl-zoom-out'
  return 'tpl-dolly' // default
}

export function TemplateBrowser({
  onSelectTemplate,
  onCustomShot,
  onBack,
}: TemplateBrowserProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [selectedTier, setSelectedTier] = useState<TemplateDurationTier | 'all'>('all')

  const filteredTemplates = useMemo(() => {
    let result = SHOT_TEMPLATES

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory)
    }

    // Duration tier filter
    if (selectedTier !== 'all') {
      result = result.filter((t) => t.durationTier === selectedTier)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    }

    return result
  }, [selectedCategory, selectedTier, search])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SHOT_TEMPLATES.length }
    for (const t of SHOT_TEMPLATES) {
      counts[t.category] = (counts[t.category] ?? 0) + 1
    }
    return counts
  }, [])

  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_KEYFRAMES }} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold">Choose a Template</h3>
          <p className="text-sm text-muted-foreground">
            {filteredTemplates.length} templates available
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="pl-9"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-8 shrink-0 text-xs"
          onClick={() => setSelectedCategory('all')}
        >
          All ({categoryCounts.all})
        </Button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={() => setSelectedCategory(cat.id)}
          >
            {getCategoryIcon(cat.icon)}
            <span className="ml-1.5">{cat.name}</span>
            <span className="ml-1 text-[10px] opacity-60">({categoryCounts[cat.id] ?? 0})</span>
          </Button>
        ))}
      </div>

      {/* Duration tier pills */}
      <div className="flex gap-2">
        <Button
          variant={selectedTier === 'all' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSelectedTier('all')}
        >
          All Durations
        </Button>
        {(Object.entries(DURATION_TIER_LABELS) as [TemplateDurationTier, { label: string; range: string }][]).map(
          ([tier, info]) => (
            <Button
              key={tier}
              variant={selectedTier === tier ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedTier(tier)}
            >
              {info.label} ({info.range})
            </Button>
          )
        )}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={() => onSelectTemplate(template)}
          />
        ))}

        {/* Custom Shot card */}
        <button
          onClick={onCustomShot}
          className="group relative flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-muted-foreground/20 p-6 transition-all duration-300 hover:scale-[1.04] hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 transition-all duration-300 group-hover:bg-primary/10 group-hover:scale-110">
            <Clapperboard className="h-6 w-6 text-muted-foreground/50 transition-colors duration-300 group-hover:text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-primary">
            Custom Shot
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            Upload your own start/end frames
          </span>
        </button>
      </div>

      {filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No templates match your search</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSearch('')
              setSelectedCategory('all')
              setSelectedTier('all')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}

function TemplateCard({
  template,
  onClick,
}: {
  template: ShotTemplate
  onClick: () => void
}) {
  const [previewing, setPreviewing] = useState(false)
  const [sceneIndex, setSceneIndex] = useState(0)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const sceneTimer = useRef<ReturnType<typeof setInterval>>(null)
  const categoryMeta = TEMPLATE_CATEGORIES.find((c) => c.id === template.category)

  // Extract scene descriptions from the template for animated text overlay
  const sceneDescriptions = useMemo(() => {
    const segments = template.segments
    if (segments && segments.length > 1) {
      return segments.map((s, i) => s.label || `Scene ${i + 1}`)
    }
    // For single-segment, create a description from template name + camera movement
    return [template.cameraMovement]
  }, [template])

  const cameraAnim = useMemo(
    () => getCameraAnimation(template.cameraMovement),
    [template.cameraMovement]
  )

  // Cycle through scenes when previewing multi-segment templates
  function startPreview() {
    setPreviewing(true)
    setSceneIndex(0)
    if (sceneDescriptions.length > 1) {
      let idx = 0
      sceneTimer.current = setInterval(() => {
        idx = (idx + 1) % sceneDescriptions.length
        setSceneIndex(idx)
      }, 2500)
    }
  }

  function stopPreview() {
    setPreviewing(false)
    setSceneIndex(0)
    if (sceneTimer.current) {
      clearInterval(sceneTimer.current)
      sceneTimer.current = null
    }
  }

  function handleMouseEnter() {
    hoverTimer.current = setTimeout(startPreview, 350)
  }

  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    stopPreview()
  }

  return (
    <button
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all duration-300 hover:scale-[1.04] hover:shadow-2xl hover:shadow-black/20 dark:hover:shadow-black/50 hover:border-primary/40 hover:z-10 ${
        previewing ? 'ring-2 ring-primary/40' : ''
      }`}
    >
      {/* Preview area */}
      <div className="relative h-36 overflow-hidden">
        {/* Base gradient — always visible, animates when previewing */}
        <div
          className="absolute inset-[-50%]"
          style={{
            background: `linear-gradient(135deg, ${template.gradientColors[0]}, ${template.gradientColors[1]}, ${template.gradientColors[0]})`,
            backgroundSize: previewing ? '300% 300%' : '100% 100%',
            animation: previewing
              ? `tpl-gradient 4s ease infinite, ${cameraAnim} 5s ease-in-out infinite alternate`
              : 'none',
            transition: 'background-size 0.5s ease',
          }}
        />

        {/* ═══ Preview overlays — only when previewing ═══ */}
        {previewing && (
          <>
            {/* Bright animated light streaks */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(110deg, transparent 30%, ${template.gradientColors[1]}66 45%, transparent 55%)`,
                animation: 'tpl-scanline 1.5s linear infinite',
              }}
            />

            {/* Animated glowing orb that moves */}
            <div
              className="absolute w-32 h-32 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${template.gradientColors[1]}88, transparent 70%)`,
                filter: 'blur(20px)',
                animation: `${cameraAnim} 4s ease-in-out infinite alternate`,
                left: '20%',
                top: '10%',
              }}
            />

            {/* Scene description text — in a contained badge */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center px-3 z-10">
              <div
                key={sceneIndex}
                className="rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 shadow-lg"
                style={{ animation: 'tpl-text-in 2.5s ease-in-out forwards' }}
              >
                <p className="text-xs font-semibold text-white text-center tracking-wide">
                  {sceneDescriptions[sceneIndex]}
                </p>
              </div>
            </div>

            {/* Scene counter for multi-segment */}
            {sceneDescriptions.length > 1 && (
              <div
                key={`counter-${sceneIndex}`}
                className="absolute top-2 left-2 z-20"
                style={{ animation: 'tpl-scene-counter 2.5s ease-in-out forwards' }}
              >
                <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
                  <Clapperboard className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[10px] font-bold text-white tabular-nums">
                    {sceneIndex + 1}/{sceneDescriptions.length}
                  </span>
                </div>
              </div>
            )}

            {/* "PREVIEW" indicator — top right */}
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 shadow-lg">
              <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Live</span>
            </div>

            {/* Camera movement at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-4">
                <div className="flex items-center gap-1.5">
                  <Play className="h-2.5 w-2.5 text-white fill-white" />
                  <p className="text-[10px] text-white/90 truncate font-medium">
                    {template.cameraMovement}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20 z-20">
              <div
                className="h-full rounded-full bg-white"
                style={{ animation: 'tpl-progress 6s linear infinite' }}
              />
            </div>
          </>
        )}

        {/* ═══ Non-preview overlays ═══ */}
        {!previewing && (
          <>
            {/* Light sweep on hover */}
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.18] to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />

            {/* Category icon watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.10] transition-all duration-500 group-hover:opacity-[0.20] group-hover:scale-110 group-hover:rotate-6">
              {categoryMeta && (
                <span className="text-white" style={{ fontSize: '3.5rem' }}>
                  {getCategoryIcon(categoryMeta.icon)}
                </span>
              )}
            </div>

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/25 shadow-lg">
                <Play className="h-4 w-4 text-white fill-white ml-0.5" />
              </div>
            </div>

            {/* Camera movement label — slides up on hover */}
            <div className="absolute bottom-0 left-0 right-0 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0 z-10">
              <div className="bg-gradient-to-t from-black/70 via-black/40 to-transparent px-3 pb-2 pt-5">
                <p className="text-[10px] text-white/90 truncate font-medium">
                  {template.cameraMovement}
                </p>
              </div>
            </div>

            {/* Top-right badges */}
            <div className="absolute right-2 top-2 flex gap-1 z-10">
              <Badge variant="secondary" className="bg-white/90 text-[10px] font-medium text-black shadow-sm">
                <Monitor className="mr-0.5 h-2.5 w-2.5" />
                4K
              </Badge>
              {template.isPopular && (
                <Badge variant="secondary" className="bg-yellow-400/90 text-[10px] font-medium text-black shadow-sm">
                  <Star className="mr-0.5 h-2.5 w-2.5" />
                  Popular
                </Badge>
              )}
              {template.isNew && (
                <Badge variant="secondary" className="bg-emerald-400/90 text-[10px] font-medium text-black shadow-sm">
                  <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                  New
                </Badge>
              )}
            </div>

            {/* Duration badge */}
            <div className="absolute bottom-2 left-2 transition-opacity duration-200 group-hover:opacity-0 z-10">
              <Badge variant="secondary" className="bg-black/60 text-[10px] font-medium text-white shadow-sm">
                {formatDuration(template.totalDurationSeconds)}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <h4 className="text-sm font-semibold leading-tight transition-colors duration-200 group-hover:text-primary">
          {template.name}
        </h4>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          {template.description}
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <Badge variant="outline" className="text-[9px] font-normal">
            {DURATION_TIER_LABELS[template.durationTier].label}
          </Badge>
          <Badge variant="outline" className="text-[9px] font-normal">
            {template.suggestedAspectRatio}
          </Badge>
          <span className="ml-auto text-[9px] text-muted-foreground">
            {formatDuration(template.totalDurationSeconds)}
          </span>
        </div>
      </div>
    </button>
  )
}
