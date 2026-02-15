'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ImageUploadZone, type UploadedImage } from './image-upload-zone'
import { ArrowRight, Package } from 'lucide-react'
import type { ProductInput } from '@/lib/veo-types'

interface ProductUploadProps {
  onProductChange: (product: ProductInput | null) => void
  onContinue: () => void
}

export function ProductUpload({ onProductChange, onContinue }: ProductUploadProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])

  const isValid = name.trim().length > 0 && images.length > 0

  function handleImagesChange(newImages: UploadedImage[]) {
    setImages(newImages)
    if (name.trim() && newImages.length > 0) {
      onProductChange({
        name: name.trim(),
        description: description.trim() || undefined,
        images: newImages,
      })
    } else {
      onProductChange(null)
    }
  }

  function handleNameChange(value: string) {
    setName(value)
    if (value.trim() && images.length > 0) {
      onProductChange({
        name: value.trim(),
        description: description.trim() || undefined,
        images,
      })
    } else {
      onProductChange(null)
    }
  }

  function handleDescriptionChange(value: string) {
    setDescription(value)
    if (name.trim() && images.length > 0) {
      onProductChange({
        name: name.trim(),
        description: value.trim() || undefined,
        images,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Upload Your Product</h3>
          <p className="text-sm text-muted-foreground">
            Add photos and details — we&apos;ll create a professional ad video
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product-name">Product Name *</Label>
          <Input
            id="product-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Premium Wireless Headphones"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-desc">Description (optional)</Label>
          <Textarea
            id="product-desc"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Noise-cancelling, 40-hour battery, premium leather cushions..."
            maxLength={500}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">{description.length}/500</p>
        </div>

        <ImageUploadZone
          maxFiles={3}
          onImagesChange={handleImagesChange}
          label="Product Photos *"
          description="Upload 1-3 product photos. Higher quality = better video output."
        />
      </div>

      {/* Preview strip */}
      {isValid && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            {images.slice(0, 3).map((img, i) => (
              <img
                key={i}
                src={img.previewUrl}
                alt={img.name}
                className="h-12 w-12 rounded-md border object-cover"
              />
            ))}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              {description && (
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={onContinue}
        disabled={!isValid}
        className="w-full"
        size="lg"
      >
        Continue to Templates
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}
