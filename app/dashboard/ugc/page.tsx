import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectivePlan, hasUGCAccess } from '@/lib/plan-utils'
import { getUserCreditBalance } from '@/lib/credits'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { UGCContent } from './content'

export default async function AIVideoStudioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: subscription }, creditBalance] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single(),
    getUserCreditBalance(user.id),
  ])

  const planId = getEffectivePlan(subscription?.plan, subscription?.status)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <DashboardNav />

      <UGCContent
        planId={planId}
        hasFullAccess={hasUGCAccess(planId)}
        creditsRemaining={creditBalance.remaining}
        creditsTotal={creditBalance.total}
      />
    </div>
  )
}
