'use client'

import { useAnalyticsData } from '@/hooks/use-analytics-data'
import { DateRangeFilter } from '@/components/dashboard/analytics/date-range-filter'
import { KPICards } from '@/components/dashboard/analytics/kpi-cards'
import { CreationTrendChart } from '@/components/dashboard/analytics/creation-trend-chart'
import { ViewsOverTimeChart } from '@/components/dashboard/analytics/views-over-time-chart'
import { TopVideosTable } from '@/components/dashboard/analytics/top-videos-table'
import { LanguageDistributionChart } from '@/components/dashboard/analytics/language-distribution-chart'
import { ModeBreakdownChart } from '@/components/dashboard/analytics/mode-breakdown-chart'
import { AIInsightsCard } from '@/components/dashboard/analytics/ai-insights-card'
import { DimensionBreakdownChart } from '@/components/dashboard/analytics/dimension-breakdown-chart'
import { AIUsageChart } from '@/components/dashboard/analytics/ai-usage-chart'
import { RecentActivityFeed } from '@/components/dashboard/analytics/recent-activity-feed'
import type { KPIData, AnalyticsData } from '@/lib/analytics-types'
import { Loader2 } from 'lucide-react'

interface AnalyticsContentProps {
  isProPlan: boolean
  initialKpis: KPIData
  initialTrends: Omit<AnalyticsData, 'kpis'>
}

export function AnalyticsContent({ isProPlan, initialKpis, initialTrends }: AnalyticsContentProps) {
  const { kpis, trends, isLoading, dateRange, granularity, updateDateRange, updateGranularity } = useAnalyticsData(initialKpis, initialTrends)

  const activePreset = (() => {
    const diffDays = Math.round((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / 86400000)
    if (diffDays <= 8) return '7'
    if (diffDays <= 31) return '30'
    return '90'
  })()

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex items-center justify-between">
        <DateRangeFilter
          onRangeChange={updateDateRange}
          activePreset={activePreset}
          isLoading={isLoading}
        />
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating...
          </div>
        )}
      </div>

      {/* Row 1: KPI Cards */}
      <KPICards data={kpis} />

      {/* Row 2: Main Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CreationTrendChart
          data={trends.creationTrend}
          granularity={granularity}
          onGranularityChange={updateGranularity}
        />
        <ViewsOverTimeChart
          data={trends.viewsTrend}
          granularity={granularity}
          onGranularityChange={updateGranularity}
        />
      </div>

      {/* Row 3: Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TopVideosTable data={trends.topVideos} />
        </div>
        <LanguageDistributionChart data={trends.languageDistribution} />
        <ModeBreakdownChart data={trends.modeBreakdown} />
      </div>

      {/* Row 4: AI Insights */}
      <AIInsightsCard isProPlan={isProPlan} />

      {/* Row 5: Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DimensionBreakdownChart data={trends.dimensionBreakdown} />
        <AIUsageChart data={trends.aiUsageOverTime} />
        <RecentActivityFeed data={trends.recentActivity} />
      </div>
    </div>
  )
}
