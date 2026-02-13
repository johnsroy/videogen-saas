'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Volume2 } from 'lucide-react'

const AUDIO_PRESETS = [
  'Upbeat background music',
  'Professional voiceover narrating the scene',
  'Ambient environmental sounds',
  'Product demo narration with gentle music',
  'Energetic social media music',
]

interface AudioDirectorProps {
  audioEnabled: boolean
  onAudioEnabledChange: (enabled: boolean) => void
  audioDirection: string
  onAudioDirectionChange: (direction: string) => void
}

export function AudioDirector({
  audioEnabled,
  onAudioEnabledChange,
  audioDirection,
  onAudioDirectionChange,
}: AudioDirectorProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Volume2 className="h-4 w-4" />
          Audio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="audio-toggle" className="text-xs">
            Generate Audio
          </Label>
          <Switch
            id="audio-toggle"
            checked={audioEnabled}
            onCheckedChange={onAudioEnabledChange}
          />
        </div>

        {audioEnabled && (
          <>
            <Textarea
              value={audioDirection}
              onChange={(e) => onAudioDirectionChange(e.target.value)}
              placeholder="Describe the audio you want..."
              rows={2}
              className="text-xs"
            />
            <div className="flex flex-wrap gap-1">
              {AUDIO_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAudioDirectionChange(preset)}
                  className="rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
