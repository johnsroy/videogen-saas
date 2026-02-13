import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { SmartEditingContent } from './content'
import { getEffectivePlan } from '@/lib/plan-utils'
import type { VideoRecord } from '@/lib/heygen-types'

export default async function SmartEditingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // All Supabase queries in parallel — no slow HeyGen API calls
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: subscription },
    { count: aiUsageThisMonth },
    { count: videosThisMonth },
    { data: completedVideos },
    { data: creditBalance },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
    supabase
      .from('script_enhancements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', firstDayOfMonth),
    supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'failed')
      .gte('created_at', firstDayOfMonth),
    supabase
      .from('videos')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('credit_balances')
      .select('credits_remaining')
      .eq('user_id', user.id)
      .single(),
  ])

  const plan = subscription?.plan ?? 'free'
  const status = subscription?.status ?? 'active'
  const planId = getEffectivePlan(plan, status)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <DashboardNav />

      <SmartEditingContent
        planId={planId}
        aiUsageThisMonth={aiUsageThisMonth ?? 0}
        videosThisMonth={videosThisMonth ?? 0}
        completedVideos={(completedVideos ?? []) as VideoRecord[]}
        creditsRemaining={creditBalance?.credits_remaining ?? 0}
      />
    </div>
  )
}
