'use client'

import { Slider } from '@/components/ui/slider'
import { Volume2, Mic, Music } from 'lucide-react'

interface VolumeMixerProps {
  originalVolume: number
  voiceoverVolume: number
  musicVolume: number
  hasVoiceover: boolean
  hasMusic: boolean
  onOriginalChange: (v: number) => void
  onVoiceoverChange: (v: number) => void
  onMusicChange: (v: number) => void
}

export function VolumeMixer({
  originalVolume,
  voiceoverVolume,
  musicVolume,
  hasVoiceover,
  hasMusic,
  onOriginalChange,
  onVoiceoverChange,
  onMusicChange,
}: VolumeMixerProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
        Audio Mix
      </span>

      {/* Original Audio */}
      <div className="flex items-center gap-2">
        <Volume2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">Original</span>
        <Slider
          value={[originalVolume]}
          onValueChange={([v]) => onOriginalChange(v)}
          min={0}
          max={100}
          step={5}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-7 text-right">{originalVolume}%</span>
      </div>

      {/* Voiceover */}
      <div className={`flex items-center gap-2 ${!hasVoiceover ? 'opacity-40' : ''}`}>
        <Mic className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">Voiceover</span>
        <Slider
          value={[voiceoverVolume]}
          onValueChange={([v]) => onVoiceoverChange(v)}
          min={0}
          max={100}
          step={5}
          disabled={!hasVoiceover}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-7 text-right">{voiceoverVolume}%</span>
      </div>

      {/* Music */}
      <div className={`flex items-center gap-2 ${!hasMusic ? 'opacity-40' : ''}`}>
        <Music className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">Music</span>
        <Slider
          value={[musicVolume]}
          onValueChange={([v]) => onMusicChange(v)}
          min={0}
          max={100}
          step={5}
          disabled={!hasMusic}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground w-7 text-right">{musicVolume}%</span>
      </div>
    </div>
  )
}
