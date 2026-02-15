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
  { name: 'Sarah', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=face' },
  { name: 'Marcus', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face' },
  { name: 'Elena', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=face' },
  { name: 'David', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face' },
  { name: 'Priya', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=face' },
  { name: 'James', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=face' },
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

/* Verified working Mixkit video URLs (all tested, 200 OK) */
const TEMPLATE_CARDS = [
  { name: 'Hero Shot', dur: '8s', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/1227/1227-720.mp4' },
  { name: 'Product Spin', dur: '15s', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/4888/4888-720.mp4' },
  { name: 'Lifestyle Scene', dur: '30s', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/235/235-720.mp4' },
  { name: 'Unboxing', dur: '15s', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/34487/34487-720.mp4' },
  { name: 'Flat Lay', dur: '8s', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/4058/4058-720.mp4' },
  { name: 'Food Close-up', dur: '8s', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/2801/2801-720.mp4' },
  { name: 'Tech Demo', dur: '30s', image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/43762/43762-720.mp4' },
  { name: 'Social Reel', dur: '15s', image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=320&h=420&fit=crop', video: 'https://assets.mixkit.co/videos/50423/50423-720.mp4' },
]

const STUDIO_STYLE_VIDEOS: Record<string, string> = {
  Cinematic: 'https://assets.mixkit.co/videos/3849/3849-720.mp4',
  'Product Demo': 'https://assets.mixkit.co/videos/1227/1227-720.mp4',
  'Social Reel': 'https://assets.mixkit.co/videos/50423/50423-720.mp4',
  Documentary: 'https://assets.mixkit.co/videos/9749/9749-720.mp4',
}

/* Avatar demo video — woman presenting/talking to camera */
const AVATAR_DEMO_VIDEO = 'https://assets.mixkit.co/videos/50417/50417-720.mp4'

/* Editing preview video */
const EDITING_PREVIEW_VIDEO = 'https://assets.mixkit.co/videos/44403/44403-720.mp4'

/* Professional music categories — SoundHelix MP3s (verified 200 OK, hotlink-friendly) */
interface MusicCategory {
  label: string
  trackName: string
  prompt: string
  audioUrl: string
  gradient: string
}

const MUSIC_CATEGORIES: Record<string, MusicCategory> = {
  'cinematic-score': {
    label: 'Cinematic Score',
    trackName: 'Cinematic Overture',
    prompt: 'A sweeping cinematic score with lush orchestral strings, French horns building to a powerful crescendo, and delicate piano motifs weaving through warm analog reverb at 90 BPM in D minor',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed, #4f46e5)',
  },
  'epic-orchestra': {
    label: 'Epic Orchestra',
    trackName: 'Epic Symphony',
    prompt: 'A rich orchestral track, deeply cinematic, symphonic strings, brass and woodwinds, an epic fantasy, triumphant, jubilant, crescendo, finale with thundering timpani and soaring brass fanfares at 140 BPM',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    gradient: 'linear-gradient(135deg, #f59e0b, #ea580c, #dc2626)',
  },
  'ambient-soundscape': {
    label: 'Ambient Soundscape',
    trackName: 'Ethereal Drift',
    prompt: 'A serene ambient soundscape with evolving synthesizer pads, gentle granular textures, sub-bass warmth, and crystalline arpeggios in a wide stereo field with slow tape-saturated reverb tails',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    gradient: 'linear-gradient(135deg, #22d3ee, #14b8a6, #059669)',
  },
  'corporate-anthem': {
    label: 'Corporate Anthem',
    trackName: 'Forward Motion',
    prompt: 'An uplifting corporate anthem with clean acoustic guitar picking, motivational piano chords, light percussion builds, and an optimistic string swell in D major at 120 BPM with crisp modern production',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    gradient: 'linear-gradient(135deg, #60a5fa, #0ea5e9, #6366f1)',
  },
  'dramatic-tension': {
    label: 'Dramatic Tension',
    trackName: 'Dark Pulse',
    prompt: 'A dark, tension-building track with pulsing sub-bass, staccato string hits, eerie dissonant synth drones, and a relentless ticking percussion motif building toward an unresolved climax in E minor',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    gradient: 'linear-gradient(135deg, #475569, #3f3f46, #171717)',
  },
}

const DEFAULT_MUSIC_CATEGORY = 'cinematic-score'

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

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
  const [selectedGenre, setSelectedGenre] = useState('cinematic-score')

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
        @keyframes ken-burns { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.08) translate(-1%,-1%)} }
        .cursor-blink::after { content:'|'; animation:blink-cursor 1s step-end infinite; color:hsl(var(--primary)); }
      `}</style>

      <div className="rounded-2xl border bg-muted/50 overflow-hidden">
        {/* ---- pill tabs + progress ---- */}
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-6 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
        <div className="relative min-h-[400px] sm:min-h-[420px] px-4 sm:px-6 py-6">
          <div key={activeTab} className="animate-in fade-in duration-300">
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
        </div>

        {/* ---- footer ---- */}
        <div className="flex items-center justify-between border-t px-4 sm:px-6 py-4">
          <div className="min-w-0">
            <p className="font-semibold truncate">{tabMeta.label}</p>
            <p className="text-sm text-muted-foreground truncate">{tabMeta.description}</p>
          </div>
          <Button asChild className="shrink-0 ml-4">
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
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* left — script + avatar preview */}
      <div className="flex-[3] space-y-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Script
        </label>
        <div className="rounded-xl border bg-background p-4 text-sm leading-relaxed text-foreground/90 min-h-[100px]">
          <span>{scriptText}</span>
          <span className="cursor-blink" />
        </div>

        {/* Avatar video preview */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video
            src={AVATAR_DEMO_VIDEO}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
            Preview — {AVATARS[selectedAvatar].name}
          </div>
          {/* Caption overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-8">
            <p className="text-white text-sm font-medium text-center">
              &ldquo;...designed for creators who want to scale their content...&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* right — avatars grid */}
      <div className="flex-[1] space-y-4 lg:min-w-[200px]">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Choose Avatar
        </label>
        <div className="grid grid-cols-3 lg:grid-cols-2 gap-3">
          {AVATARS.map((av, i) => (
            <div key={av.name} className="flex flex-col items-center gap-1.5">
              <img
                src={av.image}
                alt={av.name}
                className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover transition-all ${
                  selectedAvatar === i
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={selectedAvatar === i ? { animation: 'avatar-pulse 2s ease-in-out infinite' } : undefined}
              />
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
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {/* left — controls */}
      <div className="flex-[2] space-y-4">
        {/* prompt input */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prompt
          </label>
          <div className="mt-2 rounded-xl border bg-background px-4 py-3 text-sm min-h-[48px] flex items-center">
            <span>{typed}</span>
            <span className="cursor-blink" />
          </div>
        </div>

        {/* style chips */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Style
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
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
        </div>

        {/* ratio + duration */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ratio
            </label>
            <div className="mt-2 flex gap-1.5">
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
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Duration
            </label>
            <div className="mt-2 flex gap-1.5">
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
        </div>
      </div>

      {/* right — video preview */}
      <div className="flex-[3]">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Output Preview
        </label>
        <div className="mt-2 relative rounded-xl overflow-hidden bg-black aspect-video">
          <video
            key={selectedStyle}
            src={STUDIO_STYLE_VIDEOS[selectedStyle] ?? STUDIO_STYLE_VIDEOS['Cinematic']}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            {selectedStyle}
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {selectedRatio} &middot; {selectedDuration}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 3 — Smart Editing                                              */
/* ================================================================== */

function EditingTab({ captionIdx }: { captionIdx: number }) {
  const [toggles, setToggles] = useState({ Video: true, Voiceover: true, Music: true })
  const [levels, setLevels] = useState({ Video: 85, Voice: 100, Music: 45 })

  const tracks = [
    { label: 'Video' as const, color: 'bg-blue-500/20', width: '100%' },
    { label: 'Voiceover' as const, color: 'bg-green-500/20', width: '70%' },
    { label: 'Music' as const, color: 'bg-purple-500/20', width: '80%' },
  ]

  function handleToggle(label: string) {
    setToggles((prev) => ({ ...prev, [label]: !prev[label as keyof typeof prev] }))
  }

  function handleSlider(label: string, e: React.ChangeEvent<HTMLInputElement>) {
    setLevels((prev) => ({ ...prev, [label]: Number(e.target.value) }))
  }

  return (
    <div className="space-y-4">
      {/* Video preview */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[21/9]">
        <video
          src={EDITING_PREVIEW_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
        {/* Caption overlay on video */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-6">
          <p
            key={captionIdx}
            className="text-center text-sm font-medium text-white"
            style={{ animation: 'caption-fade 3s ease-in-out' }}
          >
            {CAPTION_LINES[captionIdx]}
          </p>
        </div>
        {/* Editing UI overlay */}
        <div className="absolute top-3 left-3 flex gap-2">
          {toggles.Voiceover && (
            <span className="rounded-full bg-green-500/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              Voiceover ON
            </span>
          )}
          {toggles.Music && (
            <span className="rounded-full bg-purple-500/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              Music ON
            </span>
          )}
        </div>
      </div>

      {/* Timeline + controls */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* tracks */}
        <div className="flex-[3] space-y-3">
          {tracks.map((track) => {
            const isOn = toggles[track.label === 'Voiceover' ? 'Voiceover' : track.label]
            return (
              <div key={track.label} className="flex items-center gap-3">
                <span className="w-16 sm:w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {track.label}
                </span>
                <div
                  className={`relative h-8 sm:h-10 flex-1 rounded-lg ${track.color} overflow-hidden transition-opacity ${isOn ? 'opacity-100' : 'opacity-30'}`}
                  style={{ width: track.width }}
                >
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
                            height: `${20 + Math.sin(i * 0.7) * 30 + ((i * 17 + 7) % 20)}%`,
                            animation: isOn ? `waveform ${0.8 + (i % 5) * 0.15}s ${i * 0.04}s ease-in-out infinite` : 'none',
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
                {/* clickable toggle */}
                <button
                  onClick={() => handleToggle(track.label)}
                  className={`h-5 w-9 shrink-0 rounded-full p-0.5 flex transition-colors ${isOn ? 'bg-primary/80' : 'bg-muted'}`}
                >
                  <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-all ${isOn ? 'ml-auto' : 'ml-0'}`} />
                </button>
              </div>
            )
          })}
        </div>

        {/* volume sliders */}
        <div className="flex-[1] space-y-4 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Levels</p>
          {([
            { label: 'Video', key: 'Video' as const },
            { label: 'Voice', key: 'Voice' as const },
            { label: 'Music', key: 'Music' as const },
          ]).map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Volume2 className="h-3 w-3" />
                  {s.label}
                </span>
                <span>{levels[s.key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={levels[s.key]}
                onChange={(e) => handleSlider(s.key, e)}
                className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 4 — Music (Real Audio Playback)                                */
/* ================================================================== */

function MusicTab({
  selectedGenre,
  setSelectedGenre,
}: {
  selectedGenre: string
  setSelectedGenre: (v: string) => void
}) {
  const categories = Object.keys(MUSIC_CATEGORIES)
  const cat = MUSIC_CATEGORIES[selectedGenre] ?? MUSIC_CATEGORIES[DEFAULT_MUSIC_CATEGORY]
  const eqPeaks = [65, 85, 50, 90, 40, 75, 95, 55, 80, 60, 70, 88]

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Switch audio source when genre changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = cat.audioUrl
    audio.load()
    setCurrentTime(0)
    setDuration(0)
    if (isPlaying) {
      audio.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime)
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration)
  }

  function handleEnded() {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Prompt card */}
      <div className="rounded-xl border bg-background px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Prompt</p>
        <p className="text-sm text-foreground/90 leading-relaxed">{cat.prompt}</p>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {categories.map((key) => {
          const c = MUSIC_CATEGORIES[key]
          return (
            <button
              key={key}
              onClick={() => setSelectedGenre(key)}
              className={`rounded-full border px-3 sm:px-4 py-1.5 text-xs font-medium transition-colors ${
                selectedGenre === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Result card — ElevenLabs style */}
      <div className="rounded-xl border bg-background p-5">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Gradient album art circle with mini equalizer */}
          <div className="relative flex-shrink-0">
            <div
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-end justify-center gap-[2px] rounded-full p-3 shadow-lg transition-all duration-500"
              style={{ background: cat.gradient }}
            >
              {eqPeaks.slice(0, 5).map((peak, i) => (
                <div
                  key={i}
                  className="w-1 sm:w-1.5 rounded-t-sm bg-white/70"
                  style={{
                    '--eq-peak': `${peak}%`,
                    height: isPlaying ? undefined : '25%',
                    animation: isPlaying
                      ? `eq-bar ${0.4 + (i % 5) * 0.15}s ${i * 0.08}s ease-in-out infinite`
                      : 'none',
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>

          {/* Track info + progress */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{cat.trackName}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{cat.label}</p>
            <div className="mt-2.5 flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] tabular-nums text-muted-foreground w-7 sm:w-8">
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const audio = audioRef.current
                  if (!audio || !duration) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  audio.currentTime = pct * duration
                  setCurrentTime(audio.currentTime)
                }}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground w-7 sm:w-8">
                {duration > 0 ? formatTime(duration) : '0:00'}
              </span>
            </div>
          </div>

          {/* Large play button */}
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 shadow-md"
          >
            {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Full equalizer */}
      <div className="flex h-20 items-end justify-center gap-1 sm:gap-1.5 rounded-xl border bg-background p-3">
        {eqPeaks.map((peak, i) => (
          <div
            key={i}
            className="w-3 sm:w-4 rounded-t-sm bg-primary transition-all"
            style={{
              '--eq-peak': `${peak}%`,
              height: isPlaying ? undefined : '20%',
              animation: isPlaying
                ? `eq-bar ${0.4 + (i % 5) * 0.15}s ${i * 0.08}s ease-in-out infinite`
                : 'none',
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 5 — Templates (Hover-to-Play Video)                            */
/* ================================================================== */

function TemplatesTab() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  function handleMouseEnter(idx: number) {
    setHoveredIdx(idx)
    videoRefs.current[idx]?.play().catch(() => {})
  }

  function handleMouseLeave(idx: number) {
    setHoveredIdx(null)
    const v = videoRefs.current[idx]
    if (v) {
      v.pause()
      v.currentTime = 0
    }
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-2">
      <div className="flex gap-3 sm:gap-4" style={{ minWidth: 'max-content' }}>
        {TEMPLATE_CARDS.map((card, idx) => (
          <div
            key={card.name}
            className="group relative w-36 sm:w-40 shrink-0 cursor-pointer overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{ aspectRatio: '3/4' }}
            onMouseEnter={() => handleMouseEnter(idx)}
            onMouseLeave={() => handleMouseLeave(idx)}
          >
            {/* stock image bg with Ken Burns on hover */}
            <img
              src={card.image}
              alt={card.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-all duration-[4s]"
              style={hoveredIdx === idx ? { animation: 'ken-burns 4s ease-out forwards' } : undefined}
            />
            {/* hover video overlay */}
            <video
              ref={(el) => { videoRefs.current[idx] = el }}
              src={card.video}
              muted
              loop
              playsInline
              preload="none"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${hoveredIdx === idx ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* play icon — visible on hover before video loads */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="h-5 w-5 text-white" />
              </div>
            </div>
            {/* bottom info */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
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
