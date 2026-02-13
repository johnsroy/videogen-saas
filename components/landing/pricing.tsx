'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PLANS, type PlanId } from '@/lib/plans'
import type { User } from '@supabase/supabase-js'

type BillingInterval = 'month' | 'year'

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'creator', 'enterprise']

export function Pricing({ user }: { user: User | null }) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month')
  const [loading, setLoading] = useState<PlanId | null>(null)

  async function handleCheckout(planId: PlanId) {
    if (!user) {
      window.location.href = '/signup'
      return
    }

    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, interval: billingInterval }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, scale as you grow. No hidden fees.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-full border p-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                billingInterval === 'month'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                billingInterval === 'year'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId]
            const isPopular = planId === 'creator'
            const price = billingInterval === 'month'
              ? plan.monthlyPrice
              : plan.yearlyPrice

            return (
              <Card
                key={planId}
                className={cn(
                  'relative flex flex-col',
                  isPopular && 'border-primary shadow-lg'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {price !== null ? (
                      <>
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-muted-foreground">
                          /{billingInterval === 'month' ? 'mo' : 'yr'}
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold">Custom</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {planId === 'free' ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/signup">Get Started</Link>
                    </Button>
                  ) : planId === 'enterprise' ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="mailto:sales@videogen.com">Contact Sales</Link>
                    </Button>
                  ) : (
                    <Button
                      className={cn('w-full', isPopular && 'bg-primary')}
                      onClick={() => handleCheckout(planId)}
                      disabled={loading !== null}
                    >
                      {loading === planId ? 'Loading...' : 'Get Started'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
