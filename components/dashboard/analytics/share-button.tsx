'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Check, Loader2 } from 'lucide-react'

interface ShareButtonProps {
  videoId: string
  videoStatus: string
}

export function ShareButton({ videoId, videoStatus }: ShareButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'copied'>('idle')

  if (videoStatus !== 'completed') return null

  async function handleShare() {
    setState('loading')
    try {
      const res = await fetch('/api/analytics/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })
      if (!res.ok) throw new Error('Failed to create share link')
      const { shareId } = await res.json()
      const url = `${window.location.origin}/v/${shareId}`
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('idle')
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} disabled={state === 'loading'}>
      {state === 'loading' ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : state === 'copied' ? (
        <Check className="mr-2 h-4 w-4 text-green-500" />
      ) : (
        <Share2 className="mr-2 h-4 w-4" />
      )}
      {state === 'copied' ? 'Copied!' : 'Share'}
    </Button>
  )
}
