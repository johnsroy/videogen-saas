'use client'

import { useRef, useEffect, useCallback } from 'react'
import { startTracking, startPinging, endTracking } from '@/lib/view-tracker'

interface ShareVideoPlayerProps {
  shareId: string
  videoUrl: string
  title: string
  thumbnailUrl: string | null
  duration: number
}

export function ShareVideoPlayer({ shareId, videoUrl, title, thumbnailUrl, duration }: ShareVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewIdRef = useRef<string | null>(null)
  const watchTimeRef = useRef(0)

  const getWatchTime = useCallback(() => {
    if (videoRef.current) {
      watchTimeRef.current = videoRef.current.currentTime
    }
    return watchTimeRef.current
  }, [])

  useEffect(() => {
    // Start tracking on mount
    startTracking(shareId).then((viewId) => {
      if (viewId) {
        viewIdRef.current = viewId
      }
    })

    // End tracking on unmount
    return () => {
      if (viewIdRef.current) {
        endTracking(viewIdRef.current, getWatchTime(), duration)
      }
    }
  }, [shareId, duration, getWatchTime])

  // Start pinging when video plays
  function handlePlay() {
    if (viewIdRef.current) {
      startPinging(viewIdRef.current, getWatchTime, duration)
    }
  }

  // Stop pinging when video pauses
  function handlePause() {
    if (viewIdRef.current) {
      // Send a final ping with current time
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'view_ping',
          share_id: shareId,
          session_id: '',
          view_id: viewIdRef.current,
          watch_duration_seconds: getWatchTime(),
          video_duration_seconds: duration,
        }),
      }).catch(() => {})
    }
  }

  // Handle page unload
  useEffect(() => {
    function handleBeforeUnload() {
      if (viewIdRef.current) {
        endTracking(viewIdRef.current, getWatchTime(), duration)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [duration, getWatchTime])

  return (
    <div className="overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-white flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-900" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-300">VideoGen</span>
        </div>
        <span className="text-xs text-gray-500 truncate ml-4">{title}</span>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        poster={thumbnailUrl || undefined}
        className="w-full"
        onPlay={handlePlay}
        onPause={handlePause}
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
