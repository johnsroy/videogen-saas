'use client'

import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createCheckoutSession, createPortalSession } from '@/app/dashboard/actions'

interface SubscriptionActionsProps {
  isProPlan: boolean
}

export function SubscriptionActions({ isProPlan }: SubscriptionActionsProps) {
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
        <form action={createCheckoutSession}>
          <Button type="submit" className="w-full">
            Upgrade to Pro
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  )
}
