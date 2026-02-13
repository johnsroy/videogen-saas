'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap } from 'lucide-react'

interface UsageCardProps {
  initialCredits?: { remaining: number; total: number }
}

export function UsageCard({ initialCredits }: UsageCardProps) {
  const [credits, setCredits] = useState(initialCredits ?? { remaining: 0, total: 0 })

  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits/balance')
        if (res.ok) {
          const data = await res.json()
          setCredits({ remaining: data.remaining, total: data.total })
        }
      } catch {
        // ignore
      }
    }
    if (!initialCredits) fetchCredits()
  }, [initialCredits])

  const percentage = credits.total > 0 ? (credits.remaining / credits.total) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          AI Video Credits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold">{credits.remaining}</span>
            <span className="text-sm text-muted-foreground"> / {credits.total}</span>
          </div>
          <span className="text-xs text-muted-foreground">remaining</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${Math.max(percentage, 2)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
