import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreditCard, Video, Sparkles, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SubscriptionActions } from '@/components/dashboard/subscription-actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const plan = subscription?.plan ?? 'free'
  const status = subscription?.status ?? 'active'
  const isProPlan = plan === 'pro' && status === 'active'
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Subscription Card */}
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
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
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
              {!isProPlan && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Videos this month</span>
                  <span className="font-medium">0 / 5</span>
                </div>
              )}
              {subscription?.cancel_at_period_end && (
                <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                  Your plan will be canceled on {periodEnd}
                </div>
              )}
            </div>
            <SubscriptionActions isProPlan={isProPlan} />
          </CardContent>
        </Card>

        {/* AI Video Generation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              AI Video Generation
            </CardTitle>
            <CardDescription>Create videos with AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
              </div>
            </div>
            <Button disabled className="w-full" variant="outline">
              Generate Video
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
