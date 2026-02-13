'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

const ESTIMATED_DURATION_MS = 5 * 60 * 1000 // 5 minutes — typical Veo generation time
const WARNING_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes — "taking longer than expected"
const STALL_THRESHOLD_MS = 15 * 60 * 1000   // 15 minutes — likely stalled

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

interface VideoProgressBarProps {
  createdAt: string
}

export function VideoProgressBar({ createdAt }: VideoProgressBarProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startTime = new Date(createdAt).getTime()

    function update() {
      setElapsed(Date.now() - startTime)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const isWarning = elapsed >= WARNING_THRESHOLD_MS
  const isStalled = elapsed >= STALL_THRESHOLD_MS

  // Progress goes from 0 to 95% over the estimated duration, never hits 100 until complete
  const rawProgress = Math.min((elapsed / ESTIMATED_DURATION_MS) * 95, 95)
  // Ease-out curve so it slows down as it approaches the end
  const progress = rawProgress < 30
    ? rawProgress
    : 30 + (rawProgress - 30) * 0.7

  // Time remaining — clamped to 0 minimum
  const remainingMs = Math.max(0, ESTIMATED_DURATION_MS - elapsed)
  const remainingMin = Math.ceil(remainingMs / 60000)

  // Stalled state (15+ min)
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

  // Warning state (10-15 min)
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
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(progress, 95)}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Processing ~ {formatElapsed(elapsed)}
        </p>
        <p className="text-xs text-muted-foreground">
          {remainingMs > 0
            ? `~${remainingMin} min left`
            : 'Almost done...'}
        </p>
      </div>
    </div>
  )
}
