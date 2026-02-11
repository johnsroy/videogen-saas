'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, ExternalLink } from 'lucide-react'
import type { VideoPerformance } from '@/lib/analytics-types'

interface TopVideosTableProps {
  data: VideoPerformance[]
}

export function TopVideosTable({ data }: TopVideosTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Top Performing Videos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No video performance data yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs">#</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs text-right">Views</TableHead>
                  <TableHead className="text-xs text-right">Avg Watch</TableHead>
                  <TableHead className="text-xs text-right">Completion</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 10).map((video, i) => (
                  <TableRow key={video.id}>
                    <TableCell className="text-xs text-muted-foreground font-medium">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[160px] truncate">{video.title}</TableCell>
                    <TableCell className="text-xs text-right">{video.views}</TableCell>
                    <TableCell className="text-xs text-right">{video.avgWatchTime}s</TableCell>
                    <TableCell className="text-xs text-right">{video.completionRate}%</TableCell>
                    <TableCell className="text-xs">
                      {video.shareId && (
                        <a
                          href={`/v/${video.shareId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
