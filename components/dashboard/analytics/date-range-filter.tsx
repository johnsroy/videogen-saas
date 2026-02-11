'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DateRangeFilterProps {
  onRangeChange: (from: string, to: string) => void
  activePreset: string
  isLoading: boolean
}

const presets = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export function DateRangeFilter({ onRangeChange, activePreset, isLoading }: DateRangeFilterProps) {
  function handlePreset(days: number, label: string) {
    const to = new Date().toISOString()
    const from = new Date(Date.now() - days * 86400000).toISOString()
    onRangeChange(from, to)
  }

  const currentPreset = (() => {
    // Determine which preset is active based on the range
    for (const p of presets) {
      if (activePreset === `${p.days}`) return p.label
    }
    return '30d'
  })()

  return (
    <div className="flex items-center gap-1">
      {presets.map((preset) => (
        <Button
          key={preset.label}
          variant={currentPreset === preset.label ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs px-3"
          onClick={() => handlePreset(preset.days, preset.label)}
          disabled={isLoading}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
