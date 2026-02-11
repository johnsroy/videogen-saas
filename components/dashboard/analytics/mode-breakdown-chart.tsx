'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell } from 'recharts'
import { Layers } from 'lucide-react'
import type { DistributionItem } from '@/lib/analytics-types'

interface ModeBreakdownChartProps {
  data: DistributionItem[]
}

const COLORS = ['var(--chart-1)', 'var(--chart-4)']

export function ModeBreakdownChart({ data }: ModeBreakdownChartProps) {
  const chartConfig = Object.fromEntries(
    data.map((item, i) => [item.name, { label: item.name, color: COLORS[i % COLORS.length] }])
  )

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Video Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <ChartContainer config={chartConfig} className="h-36 w-36">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  strokeWidth={2}
                  isAnimationActive={true}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex gap-4">
              {data.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
