'use client'

import { useState, useEffect, useCallback } from 'react'
import type { KPIData, AnalyticsData } from '@/lib/analytics-types'

const DEFAULT_KPIS: KPIData = {
  totalVideos: 0, totalVideosTrend: 0,
  totalViews: 0, totalViewsTrend: 0,
  avgCompletionRate: 0, avgCompletionRateTrend: 0,
  aiFeatureUsed: 0, aiFeatureUsedTrend: 0,
  sparklines: { videos: [], views: [], completion: [], aiUsage: [] },
}

export function useAnalyticsData(initialKpis: KPIData, initialTrends: Omit<AnalyticsData, 'kpis'>) {
  const [kpis, setKpis] = useState<KPIData>(initialKpis || DEFAULT_KPIS)
  const [trends, setTrends] = useState(initialTrends)
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 86400000).toISOString(),
    to: new Date().toISOString(),
  })
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')

  const refetch = useCallback(async (from: string, to: string, gran: string) => {
    setIsLoading(true)
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        fetch(`/api/analytics/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        fetch(`/api/analytics/trends?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&granularity=${gran}`),
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setKpis(data)
      }
      if (trendsRes.ok) {
        const data = await trendsRes.json()
        setTrends(data)
      }
    } catch {
      // Keep existing data on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  function updateDateRange(from: string, to: string) {
    setDateRange({ from, to })
    refetch(from, to, granularity)
  }

  function updateGranularity(gran: 'day' | 'week' | 'month') {
    setGranularity(gran)
    refetch(dateRange.from, dateRange.to, gran)
  }

  return {
    kpis,
    trends,
    isLoading,
    dateRange,
    granularity,
    updateDateRange,
    updateGranularity,
  }
}
