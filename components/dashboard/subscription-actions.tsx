'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createPortalSession } from '@/app/dashboard/actions'
import type { PlanId } from '@/lib/plans'

interface SubscriptionActionsProps {
  isProPlan: boolean
  currentPlan?: PlanId
}

export function SubscriptionActions({ isProPlan, currentPlan = 'free' }: SubscriptionActionsProps) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade(plan: 'starter' | 'creator') {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: 'month' }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {isProPlan ? (
        <form action={createPortalSession}>
          <Button type="submit" variant="outline" className="w-full">
            Manage Subscription
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <Button onClick={() => handleUpgrade('starter')} disabled={loading} className="w-full">
            {loading ? 'Loading...' : 'Upgrade to Starter — $29/mo'}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={() => handleUpgrade('creator')} disabled={loading} variant="outline" className="w-full">
            {loading ? 'Loading...' : 'Upgrade to Creator — $60/mo'}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
      {currentPlan === 'starter' && (
        <Button onClick={() => handleUpgrade('creator')} disabled={loading} variant="outline" className="w-full mt-1">
          {loading ? 'Loading...' : 'Upgrade to Creator — $60/mo'}
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
