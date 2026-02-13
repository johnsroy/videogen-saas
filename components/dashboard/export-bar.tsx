'use client'

import { Button } from '@/components/ui/button'
import { Save, Download, Loader2, Check, AlertCircle, Coins, ExternalLink } from 'lucide-react'

interface ExportBarProps {
  isDirty: boolean
  isSaving: boolean
  isExporting: boolean
  exportStatus: 'draft' | 'exporting' | 'completed' | 'failed'
  exportError?: string | null
  exportedVideoUrl?: string | null
  creditsRemaining: number
  exportCost: number
  onSave: () => void
  onExport: () => void
}

export function ExportBar({
  isDirty,
  isSaving,
  isExporting,
  exportStatus,
  exportError,
  exportedVideoUrl,
  creditsRemaining,
  exportCost,
  onSave,
  onExport,
}: ExportBarProps) {
  const canExport = creditsRemaining >= exportCost && !isExporting && exportStatus !== 'exporting'

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Save Draft */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Draft
            </>
          )}
        </Button>

        {/* Export Video */}
        <Button
          size="sm"
          onClick={onExport}
          disabled={!canExport}
        >
          {isExporting || exportStatus === 'exporting' ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Exporting...
            </>
          ) : exportStatus === 'completed' ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Exported
            </>
          ) : (
            <>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Video ({exportCost} credits)
            </>
          )}
        </Button>

        {/* Credits display */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Coins className="h-3 w-3" />
          {creditsRemaining} credits
        </div>
      </div>

      {/* Status messages */}
      {exportStatus === 'completed' && exportedVideoUrl && (
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <Check className="h-3.5 w-3.5" />
          <span>Video exported successfully!</span>
          <a
            href={exportedVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {exportStatus === 'failed' && exportError && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{exportError}</span>
        </div>
      )}
    </div>
  )
}
