'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadedImage {
  base64: string
  mimeType: string
  name: string
  previewUrl: string
  label?: string
}

interface ImageUploadZoneProps {
  maxFiles?: number
  onImagesChange: (images: UploadedImage[]) => void
  label?: string
  description?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const COMPRESS_MAX_DIM = 1536
const COMPRESS_QUALITY = 0.85

/** Compress and resize an image using canvas before sending to API */
function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Resize if larger than max dimension
      if (width > COMPRESS_MAX_DIM || height > COMPRESS_MAX_DIM) {
        const ratio = Math.min(COMPRESS_MAX_DIM / width, COMPRESS_MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to JPEG for smaller payload
      const dataUrl = canvas.toDataURL('image/jpeg', COMPRESS_QUALITY)
      const base64 = dataUrl.split(',')[1]
      resolve({ base64, mimeType: 'image/jpeg' })

      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }
    img.src = URL.createObjectURL(file)
  })
}

export function ImageUploadZone({
  maxFiles = 3,
  onImagesChange,
  label = 'Upload Images',
  description,
}: ImageUploadZoneProps) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(files)

      if (images.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} images allowed`)
        return
      }

      setIsProcessing(true)
      const newImages: UploadedImage[] = []

      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError('Only JPG, PNG, and WebP images are accepted')
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          setError('Files must be under 10MB')
          continue
        }

        try {
          // Compress and resize image to keep payloads small
          const { base64, mimeType } = await compressImage(file)
          const previewUrl = URL.createObjectURL(file)

          newImages.push({
            base64,
            mimeType,
            name: file.name,
            previewUrl,
          })
        } catch {
          setError(`Failed to process ${file.name}`)
        }
      }

      const updated = [...images, ...newImages].slice(0, maxFiles)
      setImages(updated)
      onImagesChange(updated)
      setIsProcessing(false)
    },
    [images, maxFiles, onImagesChange]
  )

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index)
    setImages(updated)
    onImagesChange(updated)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      {/* Upload zone */}
      {images.length < maxFiles && (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {isProcessing ? 'Compressing images...' : 'Drop images here or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground/60">
            JPG, PNG, WebP up to 10MB ({images.length}/{maxFiles})
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={maxFiles > 1}
            className="hidden"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
          />
        </div>
      )}

      {/* Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={i} className="group relative">
              <img
                src={img.previewUrl}
                alt={img.name}
                className="h-20 w-20 rounded-lg border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -right-1.5 -top-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(i)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 px-1 py-0.5">
                <p className="truncate text-[9px] text-white">{img.label || `Image ${i + 1}`}</p>
              </div>
            </div>
          ))}
          {images.length < maxFiles && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

export type { UploadedImage }
