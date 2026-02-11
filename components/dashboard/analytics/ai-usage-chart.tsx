'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Wand2 } from 'lucide-react'
import type { AIUsagePoint } from '@/lib/analytics-types'

interface AIUsageChartProps {
  data: AIUsagePoint[]
}

const chartConfig = {
  generate: { label: 'Generate', color: 'var(--chart-1)' },
  enhance: { label: 'Enhance', color: 'var(--chart-2)' },
  translate: { label: 'Translate', color: 'var(--chart-4)' },
}

export function AIUsageChart({ data }: AIUsageChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          AI Usage Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No AI usage data yet
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-32 w-full">
              <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="generate" stackId="1" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.4} />
                <Area type="monotone" dataKey="enhance" stackId="1" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.4} />
                <Area type="monotone" dataKey="translate" stackId="1" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.4} />
              </AreaChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              {Object.entries(chartConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
