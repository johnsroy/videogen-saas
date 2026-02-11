'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Pie, PieChart, Cell } from 'recharts'
import { Globe } from 'lucide-react'
import type { DistributionItem } from '@/lib/analytics-types'

interface LanguageDistributionChartProps {
  data: DistributionItem[]
}

const COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)',
]

export function LanguageDistributionChart({ data }: LanguageDistributionChartProps) {
  const chartConfig = Object.fromEntries(
    data.map((item, i) => [item.name, { label: item.name.toUpperCase(), color: COLORS[i % COLORS.length] }])
  )

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Languages
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
                  innerRadius={30}
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
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
              {data.slice(0, 5).map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name.toUpperCase()}</span>
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
