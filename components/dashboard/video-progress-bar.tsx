'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Zap, Sparkles } from 'lucide-react'

/** Estimated generation times by model */
function getEstimates(veoModel: string | null) {
  const isFast = veoModel === 'veo-3.1-fast-generate-preview'
  return {
    estimated: isFast ? 30_000 : 5 * 60_000,       // 30s vs 5min
    warning: isFast ? 2 * 60_000 : 10 * 60_000,    // 2min vs 10min
    stall: isFast ? 5 * 60_000 : 15 * 60_000,      // 5min vs 15min
    label: isFast ? 'Draft' : 'Standard',
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Almost done...'
  const totalSec = Math.ceil(ms / 1000)
  if (totalSec < 60) return `~${totalSec}s left`
  return `~${Math.ceil(ms / 60000)} min left`
}

interface VideoProgressBarProps {
  createdAt: string
  veoModel?: string | null
}

export function VideoProgressBar({ createdAt, veoModel }: VideoProgressBarProps) {
  const [elapsed, setElapsed] = useState(0)
  const { estimated, warning, stall, label } = getEstimates(veoModel ?? null)

  useEffect(() => {
    const startTime = new Date(createdAt).getTime()

    function update() {
      setElapsed(Date.now() - startTime)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const isWarning = elapsed >= warning
  const isStalled = elapsed >= stall

  // Progress goes from 0 to 95% over the estimated duration, never hits 100 until complete
  const rawProgress = Math.min((elapsed / estimated) * 95, 95)
  // Ease-out curve so it slows down as it approaches the end
  const progress = rawProgress < 30
    ? rawProgress
    : 30 + (rawProgress - 30) * 0.7

  const remainingMs = Math.max(0, estimated - elapsed)
  const isFast = veoModel === 'veo-3.1-fast-generate-preview'
  const ModeIcon = isFast ? Zap : Sparkles

  // Stalled state
  if (isStalled) {
    return (
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-destructive/20">
          <div
            className="h-full rounded-full bg-destructive/60 animate-pulse"
            style={{ width: '95%' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <p className="text-xs text-destructive">
            Generation may have stalled ({formatElapsed(elapsed)}). Cancel and retry.
          </p>
        </div>
      </div>
    )
  }

  // Warning state
  if (isWarning) {
    return (
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/30">
          <div
            className="h-full rounded-full bg-amber-500 animate-pulse"
            style={{ width: '95%' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Taking longer than expected... ({formatElapsed(elapsed)})
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(progress, 95)}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ModeIcon className="h-3 w-3" />
          {label} ~ {formatElapsed(elapsed)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatRemaining(remainingMs)}
        </p>
      </div>
    </div>
  )
}
