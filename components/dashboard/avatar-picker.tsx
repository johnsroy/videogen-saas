'use client'

import { memo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { HeyGenAvatar } from '@/lib/heygen-types'

interface AvatarPickerProps {
  selected: string | null
  onSelect: (avatarId: string) => void
}

export const AvatarPicker = memo(function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/heygen/avatars')
      .then((res) => res.json())
      .then((data) => setAvatars(data.avatars ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Select Avatar</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading avatars...
        </div>
      </div>
    )
  }

  if (error || avatars.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Select Avatar</p>
        <p className="text-sm text-destructive">Failed to load avatars</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Select Avatar</p>
      <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
        {avatars.slice(0, 30).map((avatar) => (
          <button
            key={avatar.avatar_id}
            type="button"
            onClick={() => onSelect(avatar.avatar_id)}
            className={cn(
              'relative aspect-square overflow-hidden rounded-lg border-2 transition-all hover:border-primary/50',
              selected === avatar.avatar_id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-muted'
            )}
          >
            {avatar.preview_image_url ? (
              <img
                src={avatar.preview_image_url}
                alt={avatar.avatar_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                {avatar.avatar_name?.charAt(0) || '?'}
              </div>
            )}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-muted-foreground">
          Selected: {avatars.find(a => a.avatar_id === selected)?.avatar_name || selected}
        </p>
      )}
    </div>
  )
})
