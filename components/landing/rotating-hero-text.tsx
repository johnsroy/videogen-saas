'use client'

import { useState, useEffect, useCallback } from 'react'

const HERO_VARIANTS = [
  {
    word: 'ads',
    description:
      'Use our library of AI Actors, or create your own AI Avatar. Generate UGC-style ads at scale — no actors, no studios, no limits.',
  },
  {
    word: 'music',
    description:
      'Generate original soundtracks and background scores with AI. From cinematic orchestras to lo-fi beats — perfect audio in seconds.',
  },
  {
    word: 'agents',
    description:
      'Build AI-powered video agents that create content autonomously. Scale your production pipeline with intelligent automation.',
  },
  {
    word: 'translations',
    description:
      'Translate and localize your videos into 50+ languages instantly. Same voice, same style — global reach in minutes.',
  },
  {
    word: 'experiences',
    description:
      'Craft immersive video experiences with AI cinematography. From product demos to brand stories — captivate every audience.',
  },
]

const INTERVAL = 3000
const HALF_TRANSITION = 300

export function RotatingHeroContent() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'entering'>('visible')

  const advance = useCallback(() => {
    setPhase('exiting')
    setTimeout(() => {
      setIndex((i) => (i + 1) % HERO_VARIANTS.length)
      setPhase('entering')
      // Trigger reflow then animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('visible'))
      })
    }, HALF_TRANSITION)
  }, [])

  useEffect(() => {
    const id = setInterval(advance, INTERVAL)
    return () => clearInterval(id)
  }, [advance])

  const variant = HERO_VARIANTS[index]

  const wordTransform =
    phase === 'exiting'
      ? 'translateY(-110%)'
      : phase === 'entering'
        ? 'translateY(110%)'
        : 'translateY(0)'

  const wordOpacity = phase === 'visible' ? 1 : 0

  const descOpacity = phase === 'visible' ? 1 : 0

  return (
    <>
      {/* Headline */}
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
        Create winning{' '}
        <span
          className="inline-block overflow-hidden align-bottom"
          style={{ height: '1.15em' }}
        >
          <span
            className="inline-block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
            style={{
              transform: wordTransform,
              opacity: wordOpacity,
              transition: `transform ${HALF_TRANSITION}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${HALF_TRANSITION}ms ease`,
            }}
          >
            {variant.word}
          </span>
        </span>{' '}
        with AI
      </h1>

      {/* Subheadline */}
      <p
        className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
        style={{
          opacity: descOpacity,
          transition: `opacity ${HALF_TRANSITION}ms ease`,
        }}
      >
        {variant.description}
      </p>
    </>
  )
}
