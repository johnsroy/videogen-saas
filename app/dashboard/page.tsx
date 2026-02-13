import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreditCard } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getEffectivePlan, isPaidPlan, getVideoLimit, getPlanDisplayName } from '@/lib/plan-utils'
import type { PlanId } from '@/lib/plans'
import { SubscriptionActions } from '@/components/dashboard/subscription-actions'
import { VideoGenerationCard } from '@/components/dashboard/video-generation-card'
import { VideoGallery } from '@/components/dashboard/video-gallery'
import { UsageCard } from '@/components/dashboard/usage-card'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import type { VideoRecord } from '@/lib/heygen-types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: subscription },
    { count: videosThisMonth },
    { count: aiUsageThisMonth },
    { data: recentVideos },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'failed').gte('created_at', firstDayOfMonth),
    supabase.from('script_enhancements').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', firstDayOfMonth),
    supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  const plan = subscription?.plan ?? 'free'
  const status = subscription?.status ?? 'active'
  const planId = getEffectivePlan(plan, status)
  const isProPlan = isPaidPlan(planId)
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <DashboardNav />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Subscription + Credits Cards */}
        <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription
                </CardTitle>
                <CardDescription>Your current plan and billing</CardDescription>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  isProPlan
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {getPlanDisplayName(planId)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{status}</span>
              </div>
              {periodEnd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current period ends</span>
                  <span className="font-medium">{periodEnd}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Videos this month</span>
                <span className="font-medium">
                  {getVideoLimit(planId) === null ? 'Unlimited' : `${videosThisMonth ?? 0} / ${getVideoLimit(planId)}`}
                </span>
              </div>
              {subscription?.cancel_at_period_end && (
                <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                  Your plan will be canceled on {periodEnd}
                </div>
              )}
            </div>
            <SubscriptionActions isProPlan={isProPlan} currentPlan={planId} />
          </CardContent>
        </Card>

        <UsageCard />
        </div>

        {/* Video Generation Card */}
        <div className="lg:col-span-2">
          <VideoGenerationCard
            planId={planId}
            videosThisMonth={videosThisMonth ?? 0}
            aiUsageThisMonth={aiUsageThisMonth ?? 0}
          />
        </div>
      </div>

      {/* Video Gallery */}
      <div className="mt-8">
        <VideoGallery initialVideos={(recentVideos ?? []) as VideoRecord[]} />
      </div>
    </div>
  )
}
