import { DashboardNav } from '@/components/dashboard/dashboard-nav'

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <DashboardNav />

      <div className="grid gap-8 md:grid-cols-[350px_1fr]">
        <div className="space-y-6">
          <div className="h-48 animate-pulse rounded-lg border bg-muted/50" />
          <div className="h-32 animate-pulse rounded-lg border bg-muted/50" />
        </div>
        <div className="h-96 animate-pulse rounded-lg border bg-muted/50" />
      </div>
    </div>
  )
}
