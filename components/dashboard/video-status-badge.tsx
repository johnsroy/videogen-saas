import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending: { label: 'Pending', variant: 'outline', className: 'border-yellow-500 text-yellow-600' },
  processing: { label: 'Processing', variant: 'outline', className: 'border-blue-500 text-blue-600 animate-pulse' },
  completed: { label: 'Completed', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function VideoStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const }

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
