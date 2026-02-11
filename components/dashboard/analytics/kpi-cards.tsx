'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Video, Eye, Target, Sparkles, TrendingUp, TrendingDown } from 'lucide-react'
import type { KPIData, SparklinePoint } from '@/lib/analytics-types'

interface KPICardsProps {
  data: KPIData
}

interface SingleKPIProps {
  label: string
  value: string
  trend: number
  sparkline: SparklinePoint[]
  icon: React.ReactNode
  color: string
}

function SingleKPI({ label, value, trend, sparkline, icon, color }: SingleKPIProps) {
  const isPositive = trend >= 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </div>
          <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{trend}%
          </div>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        {sparkline.length > 1 && (
          <div className="mt-2 h-10">
            <ChartContainer config={{ value: { color } }} className="h-10 w-full">
              <AreaChart data={sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#gradient-${label})`}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SingleKPI
        label="Total Videos"
        value={data.totalVideos.toLocaleString()}
        trend={data.totalVideosTrend}
        sparkline={data.sparklines.videos}
        icon={<Video className="h-3.5 w-3.5" />}
        color="hsl(var(--chart-1))"
      />
      <SingleKPI
        label="Total Views"
        value={data.totalViews.toLocaleString()}
        trend={data.totalViewsTrend}
        sparkline={data.sparklines.views}
        icon={<Eye className="h-3.5 w-3.5" />}
        color="hsl(var(--chart-2))"
      />
      <SingleKPI
        label="Avg Completion"
        value={`${data.avgCompletionRate}%`}
        trend={data.avgCompletionRateTrend}
        sparkline={data.sparklines.completion}
        icon={<Target className="h-3.5 w-3.5" />}
        color="hsl(var(--chart-3))"
      />
      <SingleKPI
        label="AI Features Used"
        value={data.aiFeatureUsed.toLocaleString()}
        trend={data.aiFeatureUsedTrend}
        sparkline={data.sparklines.aiUsage}
        icon={<Sparkles className="h-3.5 w-3.5" />}
        color="hsl(var(--chart-4))"
      />
    </div>
  )
}
