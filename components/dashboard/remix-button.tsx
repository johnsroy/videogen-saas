'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { VideoRecord } from '@/lib/heygen-types'

interface RemixButtonProps {
  video: VideoRecord
  onClose: () => void
}

export function RemixButton({ video, onClose }: RemixButtonProps) {
  function handleRemix() {
    window.dispatchEvent(new CustomEvent('video-remix', { detail: video }))
    onClose()
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleRemix}>
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      Remix
    </Button>
  )
}
