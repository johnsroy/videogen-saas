export interface DateRange {
  from: string // ISO date
  to: string   // ISO date
  preset: '7d' | '30d' | '90d' | 'custom'
}

export interface SparklinePoint {
  date: string
  value: number
}

export interface KPIData {
  totalVideos: number
  totalVideosTrend: number
  totalViews: number
  totalViewsTrend: number
  avgCompletionRate: number
  avgCompletionRateTrend: number
  aiFeatureUsed: number
  aiFeatureUsedTrend: number
  sparklines: {
    videos: SparklinePoint[]
    views: SparklinePoint[]
    completion: SparklinePoint[]
    aiUsage: SparklinePoint[]
  }
}

export interface TrendPoint {
  date: string
  count: number
}

export interface DistributionItem {
  name: string
  value: number
}

export interface VideoPerformance {
  id: string
  title: string
  views: number
  avgWatchTime: number
  completionRate: number
  shareId: string | null
}

export interface AIUsagePoint {
  date: string
  generate: number
  enhance: number
  translate: number
}

export interface AIInsight {
  icon: string
  title: string
  description: string
  category: 'performance' | 'content' | 'engagement' | 'growth'
}

export interface ActivityEvent {
  id: string
  type: 'video_created' | 'video_viewed' | 'ai_used' | 'share_created'
  title: string
  description: string
  timestamp: string
}

export interface AnalyticsData {
  kpis: KPIData
  creationTrend: TrendPoint[]
  viewsTrend: TrendPoint[]
  languageDistribution: DistributionItem[]
  modeBreakdown: DistributionItem[]
  dimensionBreakdown: DistributionItem[]
  topVideos: VideoPerformance[]
  aiUsageOverTime: AIUsagePoint[]
  recentActivity: ActivityEvent[]
}

export interface ViewEvent {
  event: 'view_start' | 'view_ping' | 'view_end'
  share_id: string
  session_id: string
  referrer?: string
  view_id?: string
  watch_duration_seconds?: number
  video_duration_seconds?: number
}
