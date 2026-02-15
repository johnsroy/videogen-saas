'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Play, Pause, Volume2 } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'avatars', label: 'AI Avatars', description: 'Lifelike AI presenters that speak your script in any language.' },
  { id: 'studio', label: 'AI Video Studio', description: 'Generate cinematic video from a single text prompt.' },
  { id: 'editing', label: 'Smart Editing', description: 'Multi-track timeline with captions, music & voiceover.' },
  { id: 'music', label: 'Music', description: 'AI-composed royalty-free music matched to your video mood.' },
  { id: 'templates', label: 'Templates', description: 'Ready-made scenes you can customise in seconds.' },
] as const

type TabId = (typeof TABS)[number]['id']

const AUTO_ROTATE_MS = 8000
const IDLE_RESUME_MS = 15000

const AVATARS = [
  { name: 'Sarah', gradient: 'from-pink-400 to-rose-500' },
  { name: 'Marcus', gradient: 'from-blue-400 to-indigo-500' },
  { name: 'Elena', gradient: 'from-amber-400 to-orange-500' },
  { name: 'David', gradient: 'from-emerald-400 to-green-600' },
  { name: 'Priya', gradient: 'from-violet-400 to-purple-600' },
  { name: 'James', gradient: 'from-cyan-400 to-teal-500' },
]

const STUDIO_PROMPTS = [
  'A golden perfume bottle slowly rotates on a marble surface...',
  'Aerial drone shot of a Tesla driving through mountains...',
  'Close-up of fresh sushi being prepared by a chef...',
]

const CAPTION_LINES = [
  'Welcome to the future of video creation',
  'Our AI makes it effortless',
  'Scale your content like never before',
]

const TEMPLATE_CARDS = [
  { name: 'Hero Shot', dur: '8s', colors: ['#667eea', '#764ba2'] },
  { name: 'Product Spin', dur: '15s', colors: ['#f093fb', '#f5576c'] },
  { name: 'Lifestyle Scene', dur: '30s', colors: ['#4facfe', '#00f2fe'] },
  { name: 'Unboxing', dur: '15s', colors: ['#43e97b', '#38f9d7'] },
  { name: 'Flat Lay', dur: '8s', colors: ['#fa709a', '#fee140'] },
  { name: 'Food Close-up', dur: '8s', colors: ['#a18cd1', '#fbc2eb'] },
  { name: 'Tech Demo', dur: '30s', colors: ['#fccb90', '#d57eeb'] },
  { name: 'Social Reel', dur: '15s', colors: ['#e0c3fc', '#8ec5fc'] },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('avatars')
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef(Date.now())

  /* ---- auto-rotate helpers ---- */

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (idleRef.current) clearTimeout(idleRef.current)
  }, [])

  const startAutoRotate = useCallback(() => {
    clearTimers()
    setPaused(false)
    startRef.current = Date.now()
    setProgress(0)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min((elapsed / AUTO_ROTATE_MS) * 100, 100)
      setProgress(pct)

      if (elapsed >= AUTO_ROTATE_MS) {
        startRef.current = Date.now()
        setProgress(0)
        setActiveTab((prev) => {
          const idx = TABS.findIndex((t) => t.id === prev)
          return TABS[(idx + 1) % TABS.length].id
        })
      }
    }, 50)
  }, [clearTimers])

  const handleTabClick = useCallback(
    (id: TabId) => {
      setActiveTab(id)
      clearTimers()
      setPaused(true)
      setProgress(0)

      idleRef.current = setTimeout(() => {
        startAutoRotate()
      }, IDLE_RESUME_MS)
    },
    [clearTimers, startAutoRotate],
  )

  useEffect(() => {
    startAutoRotate()
    return clearTimers
  }, [startAutoRotate, clearTimers])

  /* ---- sub-component state ---- */

  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [studioPromptIdx, setStudioPromptIdx] = useState(0)
  const [studioTyped, setStudioTyped] = useState('')
  const [captionIdx, setCaptionIdx] = useState(0)
  const [selectedStyle, setSelectedStyle] = useState('Cinematic')
  const [selectedRatio, setSelectedRatio] = useState('16:9')
  const [selectedDuration, setSelectedDuration] = useState('8s')
  const [selectedGenre, setSelectedGenre] = useState('Electronic')

  // Avatar cycling
  useEffect(() => {
    const iv = setInterval(() => setSelectedAvatar((p) => (p + 1) % AVATARS.length), 3000)
    return () => clearInterval(iv)
  }, [])

  // Studio typewriter
  useEffect(() => {
    const target = STUDIO_PROMPTS[studioPromptIdx]
    if (studioTyped.length < target.length) {
      const t = setTimeout(() => setStudioTyped(target.slice(0, studioTyped.length + 1)), 38)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setStudioTyped('')
      setStudioPromptIdx((p) => (p + 1) % STUDIO_PROMPTS.length)
    }, 2200)
    return () => clearTimeout(t)
  }, [studioTyped, studioPromptIdx])

  // Caption cycling
  useEffect(() => {
    const iv = setInterval(() => setCaptionIdx((p) => (p + 1) % CAPTION_LINES.length), 3000)
    return () => clearInterval(iv)
  }, [])

  /* ---- active tab meta ---- */
  const tabMeta = TABS.find((t) => t.id === activeTab)!

  /* ---- render ---- */
  return (
    <section id="interactive-demo" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      {/* Inject keyframes */}
      <style>{`
        @keyframes blink-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes avatar-pulse { 0%,100%{box-shadow:0 0 0 0 hsl(var(--primary)/.4)} 50%{box-shadow:0 0 0 6px hsl(var(--primary)/0)} }
        @keyframes bounce-dot { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes eq-bar { 0%,100%{height:20%} 50%{height:var(--eq-peak)} }
        @keyframes caption-fade { 0%{opacity:0;transform:translateY(6px)} 15%{opacity:1;transform:translateY(0)} 85%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-6px)} }
        @keyframes waveform { 0%,100%{height:30%} 25%{height:70%} 50%{height:45%} 75%{height:85%} }
        .cursor-blink::after { content:'|'; animation:blink-cursor 1s step-end infinite; color:hsl(var(--primary)); }
      `}</style>

      <div className="rounded-2xl border bg-muted/50 overflow-hidden">
        {/* ---- pill tabs + progress ---- */}
        <div className="flex flex-wrap items-center gap-2 px-6 pt-6 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
              {/* thin progress bar under active tab */}
              {activeTab === tab.id && !paused && (
                <span
                  className="absolute bottom-0 left-0 h-[2px] bg-primary-foreground/60 rounded-full transition-none"
                  style={{ width: `${progress}%` }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ---- content area ---- */}
        <div className="relative min-h-[420px] px-6 py-6">
          {activeTab === 'avatars' && <AvatarsTab selectedAvatar={selectedAvatar} />}
          {activeTab === 'studio' && (
            <StudioTab
              typed={studioTyped}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              selectedRatio={selectedRatio}
              setSelectedRatio={setSelectedRatio}
              selectedDuration={selectedDuration}
              setSelectedDuration={setSelectedDuration}
            />
          )}
          {activeTab === 'editing' && <EditingTab captionIdx={captionIdx} />}
          {activeTab === 'music' && (
            <MusicTab selectedGenre={selectedGenre} setSelectedGenre={setSelectedGenre} />
          )}
          {activeTab === 'templates' && <TemplatesTab />}
        </div>

        {/* ---- footer ---- */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div>
            <p className="font-semibold">{tabMeta.label}</p>
            <p className="text-sm text-muted-foreground">{tabMeta.description}</p>
          </div>
          <Button asChild>
            <Link href="/signup">
              Sign up
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ================================================================== */
/*  Tab 1 — AI Avatars                                                 */
/* ================================================================== */

function AvatarsTab({ selectedAvatar }: { selectedAvatar: number }) {
  const scriptText =
    "Hi there! I'm excited to tell you about our amazing new product. It's designed for creators who want to scale their content..."

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      {/* left — script */}
      <div className="flex-[3] space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Script
        </label>
        <div className="rounded-xl border bg-background p-4 text-sm leading-relaxed text-foreground/90 min-h-[180px]">
          <span>{scriptText}</span>
          <span className="cursor-blink" />
        </div>
      </div>

      {/* right — avatars grid */}
      <div className="flex-[2] space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map((av, i) => (
            <div key={av.name} className="flex flex-col items-center gap-1.5">
              <div
                className={`h-16 w-16 rounded-full bg-gradient-to-br ${av.gradient} flex items-center justify-center text-white text-lg font-bold transition-all ${
                  selectedAvatar === i
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : ''
                }`}
                style={selectedAvatar === i ? { animation: 'avatar-pulse 2s ease-in-out infinite' } : undefined}
              >
                {av.name[0]}
              </div>
              <span className="text-xs font-medium text-muted-foreground">{av.name}</span>
            </div>
          ))}
        </div>

        {/* generating indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex gap-1">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: `bounce-dot 0.6s ${d * 0.15}s ease-in-out infinite` }}
              />
            ))}
          </span>
          <span>Generating video...</span>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 2 — AI Video Studio                                            */
/* ================================================================== */

function StudioTab({
  typed,
  selectedStyle,
  setSelectedStyle,
  selectedRatio,
  setSelectedRatio,
  selectedDuration,
  setSelectedDuration,
}: {
  typed: string
  selectedStyle: string
  setSelectedStyle: (v: string) => void
  selectedRatio: string
  setSelectedRatio: (v: string) => void
  selectedDuration: string
  setSelectedDuration: (v: string) => void
}) {
  const styles = ['Cinematic', 'Product Demo', 'Social Reel', 'Documentary']
  const ratios = ['16:9', '9:16']
  const durations = ['4s', '8s', '15s']

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* prompt input */}
      <div className="rounded-xl border bg-background px-4 py-3 text-sm min-h-[48px] flex items-center">
        <span>{typed}</span>
        <span className="cursor-blink" />
      </div>

      {/* style chips */}
      <div className="flex flex-wrap gap-2">
        {styles.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStyle(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedStyle === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ratio + duration */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1.5">
          {ratios.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRatio(r)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                selectedRatio === r
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDuration(d)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                selectedDuration === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* gradient preview */}
      <div
        className="relative flex h-[200px] items-center justify-center rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
          backgroundSize: '400% 400%',
          animation: 'gradient-shift 6s ease infinite',
        }}
      >
        <div className="flex items-center gap-3 rounded-full bg-black/30 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Generating your video...
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 3 — Smart Editing                                              */
/* ================================================================== */

function EditingTab({ captionIdx }: { captionIdx: number }) {
  const tracks = [
    { label: 'Video', color: 'bg-blue-500/20', barColor: 'bg-blue-500', width: '100%' },
    { label: 'Voiceover', color: 'bg-green-500/20', barColor: 'bg-green-500', width: '70%' },
    { label: 'Music', color: 'bg-purple-500/20', barColor: 'bg-purple-500', width: '80%' },
  ]

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      {/* tracks */}
      <div className="flex-[3] space-y-4">
        {tracks.map((track) => (
          <div key={track.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {track.label}
            </span>
            <div className={`relative h-10 flex-1 rounded-lg ${track.color} overflow-hidden`} style={{ width: track.width }}>
              {/* segments / waveform pattern */}
              {track.label === 'Video' && (
                <div className="absolute inset-0 flex gap-[2px] p-1">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${i % 3 === 0 ? 'bg-blue-500/50' : i % 3 === 1 ? 'bg-blue-400/40' : 'bg-blue-600/35'}`}
                    />
                  ))}
                </div>
              )}
              {track.label === 'Voiceover' && (
                <div className="absolute inset-0 flex items-center gap-[1px] px-1">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-green-500/60"
                      style={{
                        height: `${20 + Math.sin(i * 0.7) * 30 + Math.random() * 20}%`,
                        animation: `waveform ${0.8 + (i % 5) * 0.15}s ${i * 0.04}s ease-in-out infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
              {track.label === 'Music' && (
                <div className="absolute inset-0 flex items-center gap-[2px] px-1">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-purple-500/50"
                      style={{ height: `${30 + ((i * 17) % 50)}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* toggle */}
            <div className="h-5 w-9 shrink-0 rounded-full bg-primary/80 p-0.5 flex">
              <div className="ml-auto h-4 w-4 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        ))}

        {/* caption preview */}
        <div className="mt-4 flex items-center justify-center rounded-lg border bg-background p-4 min-h-[56px]">
          <p
            key={captionIdx}
            className="text-center text-sm font-medium"
            style={{ animation: 'caption-fade 3s ease-in-out' }}
          >
            {CAPTION_LINES[captionIdx]}
          </p>
        </div>
      </div>

      {/* volume sliders */}
      <div className="flex-[1] space-y-5 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Levels</p>
        {[
          { label: 'Video', pct: 85 },
          { label: 'Voice', pct: 100 },
          { label: 'Music', pct: 45 },
        ].map((s) => (
          <div key={s.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                {s.label}
              </span>
              <span>{s.pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 4 — Music                                                      */
/* ================================================================== */

function MusicTab({
  selectedGenre,
  setSelectedGenre,
}: {
  selectedGenre: string
  setSelectedGenre: (v: string) => void
}) {
  const genres = ['Pop', 'Cinematic', 'Electronic', 'Jazz', 'Lo-fi']
  const eqPeaks = [65, 85, 50, 90, 40, 75, 95, 55, 80, 60, 70, 88]

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* prompt */}
      <div className="rounded-xl border bg-background px-4 py-3 text-sm text-foreground/90 min-h-[60px]">
        An upbeat electronic track with warm synthesizers and a driving beat
      </div>

      {/* genre chips */}
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGenre(g)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedGenre === g
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* equalizer */}
      <div className="flex h-32 items-end justify-center gap-1.5 rounded-xl border bg-background p-4">
        {eqPeaks.map((peak, i) => (
          <div
            key={i}
            className="w-4 rounded-t-sm bg-primary"
            style={{
              '--eq-peak': `${peak}%`,
              height: '20%',
              animation: `eq-bar ${0.4 + (i % 5) * 0.15}s ${i * 0.08}s ease-in-out infinite`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* player bar */}
      <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
        <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full w-[35%] rounded-full bg-primary" />
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">0:11 / 0:30</span>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 5 — Templates                                                  */
/* ================================================================== */

function TemplatesTab() {
  return (
    <div className="overflow-x-auto -mx-6 px-6 pb-2">
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {TEMPLATE_CARDS.map((card) => (
          <div
            key={card.name}
            className="group relative w-40 shrink-0 cursor-pointer overflow-hidden rounded-xl transition-all hover:scale-105 hover:shadow-lg"
            style={{ aspectRatio: '3/4' }}
          >
            {/* gradient bg */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${card.colors[0]}, ${card.colors[1]})`,
              }}
            />
            {/* play icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
                <Play className="h-5 w-5 text-white" />
              </div>
            </div>
            {/* bottom info */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pb-3 pt-8">
              <p className="text-sm font-semibold text-white">{card.name}</p>
              <span className="mt-0.5 inline-block rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                {card.dur}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
