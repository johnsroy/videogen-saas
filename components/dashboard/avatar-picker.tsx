'use client'

import { memo, useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Plus, User } from 'lucide-react'
import { CustomAvatarDialog } from './custom-avatar-dialog'
import type { HeyGenAvatar } from '@/lib/heygen-types'

interface AvatarPickerProps {
  selected: string | null
  onSelect: (avatarId: string) => void
}

type GenderFilter = 'all' | 'male' | 'female'

export const AvatarPicker = memo(function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [showCustomDialog, setShowCustomDialog] = useState(false)

  useEffect(() => {
    fetch('/api/heygen/avatars')
      .then((res) => res.json())
      .then((data) => setAvatars(data.avatars ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filteredAvatars = useMemo(() => {
    let result = avatars
    if (genderFilter !== 'all') {
      result = result.filter((a) => a.gender?.toLowerCase() === genderFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.avatar_name?.toLowerCase().includes(q))
    }
    return result
  }, [avatars, genderFilter, search])

  function handleAvatarCreated(avatar: HeyGenAvatar) {
    setAvatars((prev) => [avatar, ...prev])
    onSelect(avatar.avatar_id)
  }

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Select Avatar</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setShowCustomDialog(true)}
        >
          <Plus className="h-3 w-3" />
          Create Custom
        </Button>
      </div>

      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search avatars..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="flex gap-0.5 rounded-md border p-0.5">
          {(['all', 'male', 'female'] as GenderFilter[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={cn(
                'rounded-sm px-2 py-1 text-[10px] font-medium capitalize transition-colors',
                genderFilter === g
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar grid — show ALL avatars */}
      <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
        {filteredAvatars.map((avatar) => (
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
            title={avatar.avatar_name}
          >
            {avatar.preview_image_url ? (
              <img
                src={avatar.preview_image_url}
                alt={avatar.avatar_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                <User className="h-5 w-5" />
              </div>
            )}
          </button>
        ))}
        {filteredAvatars.length === 0 && (
          <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
            No avatars found
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        {selected && (
          <p className="text-xs text-muted-foreground">
            Selected: {avatars.find(a => a.avatar_id === selected)?.avatar_name || selected}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground ml-auto">
          {filteredAvatars.length} avatars
        </p>
      </div>

      <CustomAvatarDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        onAvatarCreated={handleAvatarCreated}
      />
    </div>
  )
})
