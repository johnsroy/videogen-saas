'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins, AlertTriangle } from 'lucide-react'

interface CreditCostPreviewProps {
  creditsRemaining: number
}

export function CreditCostPreview({ creditsRemaining }: CreditCostPreviewProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4" />
          AI Video Credits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold">{creditsRemaining}</span>
          <span className="text-xs text-muted-foreground">remaining</span>
        </div>

        <div className="space-y-1.5 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Cost per video</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Standard 4K (4s)</span>
              <span className="font-medium">8 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Standard 4K (8s)</span>
              <span className="font-medium">16 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Draft Fast (4s)</span>
              <span className="font-medium">4 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Draft Fast (8s)</span>
              <span className="font-medium">8 credits</span>
            </div>
          </div>
        </div>

        {creditsRemaining <= 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            No credits remaining. Upgrade for more.
          </div>
        )}
        {creditsRemaining > 0 && creditsRemaining <= 8 && (
          <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 px-2 py-1.5 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Low credits. Consider upgrading your plan.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
