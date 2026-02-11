let currentViewId: string | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('vg-session-id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('vg-session-id', id)
  }
  return id
}

export async function startTracking(shareId: string): Promise<string | null> {
  const sessionId = getSessionId()
  try {
    const res = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'view_start',
        share_id: shareId,
        session_id: sessionId,
        referrer: document.referrer || undefined,
      }),
    })
    const data = await res.json()
    if (data.view_id) {
      currentViewId = data.view_id
      return data.view_id
    }
  } catch {
    // Silently fail — tracking should never break the user experience
  }
  return null
}

export function startPinging(
  viewId: string,
  getWatchTime: () => number,
  videoDuration: number
) {
  stopPinging()
  pingInterval = setInterval(async () => {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'view_ping',
          share_id: '',
          session_id: getSessionId(),
          view_id: viewId,
          watch_duration_seconds: getWatchTime(),
          video_duration_seconds: videoDuration,
        }),
      })
    } catch {
      // Silent fail
    }
  }, 5000)
}

export function stopPinging() {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

export function endTracking(
  viewId: string,
  watchDuration: number,
  videoDuration: number
) {
  stopPinging()
  const body = JSON.stringify({
    event: 'view_end',
    share_id: '',
    session_id: getSessionId(),
    view_id: viewId,
    watch_duration_seconds: watchDuration,
    video_duration_seconds: videoDuration,
  })

  // Use sendBeacon for reliability on page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/analytics/track',
      new Blob([body], { type: 'application/json' })
    )
  } else {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }
  currentViewId = null
}

export function getCurrentViewId(): string | null {
  return currentViewId
}
