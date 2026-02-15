'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, User } from 'lucide-react'
import type { HeyGenAvatar } from '@/lib/heygen-types'

interface CustomAvatarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAvatarCreated: (avatar: HeyGenAvatar) => void
}

export function CustomAvatarDialog({ open, onOpenChange, onAvatarCreated }: CustomAvatarDialogProps) {
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    setPhoto({
      file,
      previewUrl: URL.createObjectURL(file),
    })
    setError(null)
  }, [])

  async function handleCreate() {
    if (!name.trim() || !photo) return
    setIsCreating(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('photo', photo.file)

      const res = await fetch('/api/heygen/create-avatar', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create avatar')
        return
      }
      onAvatarCreated(data.avatar)
      onOpenChange(false)
      // Reset form
      setName('')
      setPhoto(null)
    } catch {
      setError('Failed to create avatar')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Avatar</DialogTitle>
          <DialogDescription>
            Upload a clear photo of a person to create a custom talking avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {photo ? (
              <div className="relative mx-auto w-32">
                <img
                  src={photo.previewUrl}
                  alt="Avatar preview"
                  className="h-32 w-32 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Upload a photo</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP, under 10MB</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Avatar name */}
          <div className="space-y-2">
            <Label>Avatar Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Avatar"
              maxLength={100}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !photo || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Create Avatar
                </>
              )}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            For best results, use a well-lit, front-facing photo with a neutral background. The photo should clearly show the person&apos;s face.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
