'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ExternalLink, X } from 'lucide-react'

interface VideoCreatedToastProps {
  visible: boolean
  title: string
  onDismiss: () => void
}

export function VideoCreatedToast({ visible, title, onDismiss }: VideoCreatedToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        onDismiss()
      }, 8000)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [visible, onDismiss])

  if (!show) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-2xl shadow-black/20 max-w-sm">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Video Generation Started</p>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            &ldquo;{title}&rdquo; is now being generated
          </p>
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-auto p-0 text-xs text-primary"
            onClick={() => {
              window.location.href = '/dashboard'
            }}
          >
            Go to Create tab to track progress
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => {
            setShow(false)
            onDismiss()
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
