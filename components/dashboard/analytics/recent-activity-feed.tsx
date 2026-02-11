'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Eye, Sparkles, Share2, Activity } from 'lucide-react'
import type { ActivityEvent } from '@/lib/analytics-types'

interface RecentActivityFeedProps {
  data: ActivityEvent[]
}

const iconMap: Record<string, React.ReactNode> = {
  video_created: <Video className="h-3.5 w-3.5 text-blue-500" />,
  video_viewed: <Eye className="h-3.5 w-3.5 text-green-500" />,
  ai_used: <Sparkles className="h-3.5 w-3.5 text-purple-500" />,
  share_created: <Share2 className="h-3.5 w-3.5 text-orange-500" />,
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentActivityFeed({ data }: RecentActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {data.map((event) => (
              <div key={event.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50">
                <div className="shrink-0">
                  {iconMap[event.type] || <Activity className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{event.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{event.description}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(event.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
