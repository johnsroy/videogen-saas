'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette } from 'lucide-react'

export interface StylePreset {
  id: string
  name: string
  promptPrefix: string
  negativePrompt: string
  suggestedDuration: number
  suggestedAspectRatio: '16:9' | '9:16'
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'ugc',
    name: 'UGC / Authentic',
    promptPrefix: 'In a casual UGC style, handheld camera feel, authentic and relatable, ',
    negativePrompt: 'overly polished, corporate, stock footage look',
    suggestedDuration: 8,
    suggestedAspectRatio: '9:16',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    promptPrefix: 'Cinematic quality, dramatic lighting, shallow depth of field, professional color grading, ',
    negativePrompt: 'amateur, shaky, low quality, overexposed',
    suggestedDuration: 8,
    suggestedAspectRatio: '16:9',
  },
  {
    id: 'product',
    name: 'Product Demo',
    promptPrefix: 'Clean product showcase, white or minimal background, smooth camera movement, professional studio lighting, ',
    negativePrompt: 'cluttered background, poor lighting, blurry',
    suggestedDuration: 6,
    suggestedAspectRatio: '16:9',
  },
  {
    id: 'social',
    name: 'Social Media',
    promptPrefix: 'Engaging social media content, vibrant colors, dynamic transitions, eye-catching, ',
    negativePrompt: 'boring, static, dull colors',
    suggestedDuration: 6,
    suggestedAspectRatio: '9:16',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    promptPrefix: 'Professional corporate style, clean and polished, modern office aesthetic, ',
    negativePrompt: 'casual, unprofessional, messy',
    suggestedDuration: 8,
    suggestedAspectRatio: '16:9',
  },
  {
    id: 'custom',
    name: 'Custom',
    promptPrefix: '',
    negativePrompt: '',
    suggestedDuration: 8,
    suggestedAspectRatio: '16:9',
  },
]

interface StylePresetsProps {
  value: string
  onChange: (preset: StylePreset) => void
}

export function StylePresets({ value, onChange }: StylePresetsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Palette className="h-4 w-4" />
          Style
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-1.5">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                value === preset.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export { STYLE_PRESETS }
