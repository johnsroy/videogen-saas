'use client'

import { useState, useEffect } from 'react'

const ESTIMATED_DURATION_MS = 3 * 60 * 1000 // 3 minutes estimated

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

  // Progress goes from 0 to 95% over the estimated duration, never hits 100 until complete
  const rawProgress = Math.min((elapsed / ESTIMATED_DURATION_MS) * 95, 95)
  // Ease-out curve so it slows down as it approaches the end
  const progress = rawProgress < 30
    ? rawProgress
    : 30 + (rawProgress - 30) * 0.7

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
          ~{Math.ceil((ESTIMATED_DURATION_MS - elapsed) / 60000)} min left
        </p>
      </div>
    </div>
  )
}
