'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import type { HeyGenAvatar } from '@/lib/heygen-types'

interface AvatarPickerProps {
  selected: string | null
  onSelect: (avatarId: string) => void
  initialAvatars: HeyGenAvatar[]
}

export const AvatarPicker = memo(function AvatarPicker({ selected, onSelect, initialAvatars }: AvatarPickerProps) {
  const avatars = initialAvatars

  if (avatars.length === 0) {
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
