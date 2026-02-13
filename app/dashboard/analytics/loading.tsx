import { DashboardNav } from '@/components/dashboard/dashboard-nav'

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <DashboardNav />

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted/50" />
        ))}
      </div>
      <div className="mt-6 h-72 animate-pulse rounded-lg border bg-muted/50" />
    </div>
  )
}
