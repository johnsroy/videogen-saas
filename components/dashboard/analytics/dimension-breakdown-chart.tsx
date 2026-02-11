'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { Monitor } from 'lucide-react'
import type { DistributionItem } from '@/lib/analytics-types'

interface DimensionBreakdownChartProps {
  data: DistributionItem[]
}

const chartConfig = {
  value: {
    label: 'Videos',
    color: 'var(--chart-3)',
  },
}

export function DimensionBreakdownChart({ data }: DimensionBreakdownChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const withPercent = data.map((d) => ({
    ...d,
    percent: total > 0 ? Math.round((d.value / total) * 100) : 0,
    label: `${d.name} (${total > 0 ? Math.round((d.value / total) * 100) : 0}%)`,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Dimensions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-32 w-full">
            <BarChart data={withPercent} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="value"
                fill="var(--chart-3)"
                radius={[0, 4, 4, 0]}
                isAnimationActive={true}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
