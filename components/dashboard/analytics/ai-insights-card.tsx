'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles, TrendingUp, Globe, Clock, Target, BarChart3, Zap, Users,
  RefreshCw, Loader2, Brain,
} from 'lucide-react'
import type { AIInsight } from '@/lib/analytics-types'

interface AIInsightsCardProps {
  isProPlan: boolean
}

const iconMap: Record<string, React.ReactNode> = {
  'trending-up': <TrendingUp className="h-4 w-4" />,
  'globe': <Globe className="h-4 w-4" />,
  'clock': <Clock className="h-4 w-4" />,
  'sparkles': <Sparkles className="h-4 w-4" />,
  'target': <Target className="h-4 w-4" />,
  'bar-chart': <BarChart3 className="h-4 w-4" />,
  'zap': <Zap className="h-4 w-4" />,
  'users': <Users className="h-4 w-4" />,
}

const categoryColors: Record<string, string> = {
  performance: 'text-blue-500 bg-blue-500/10',
  content: 'text-purple-500 bg-purple-500/10',
  engagement: 'text-green-500 bg-green-500/10',
  growth: 'text-orange-500 bg-orange-500/10',
}

export function AIInsightsCard({ isProPlan }: AIInsightsCardProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/analytics-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to generate insights')
        return
      }
      setInsights(data.insights || [])
      setHasLoaded(true)
    } catch {
      setError('Failed to generate insights')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI-Powered Insights
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          {hasLoaded ? 'Refresh' : 'Generate'}
        </Button>
      </CardHeader>
      <CardContent>
        {!hasLoaded && !isLoading ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium">Get AI-Powered Recommendations</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click Generate to analyze your data and get personalized insights
              </p>
            </div>
            <Button size="sm" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Generate Insights
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3 rounded-lg border p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${categoryColors[insight.category] || 'text-muted-foreground bg-muted'}`}>
                  {iconMap[insight.icon] || <Sparkles className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  )
}
