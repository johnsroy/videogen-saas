'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

type BillingInterval = 'month' | 'year'

const features = [
  { text: '5 videos per month', free: true, pro: true },
  { text: 'Unlimited videos', free: false, pro: true },
  { text: '4K resolution', free: false, pro: true },
  { text: 'Premium templates', free: false, pro: true },
  { text: 'AI voiceover', free: false, pro: true },
  { text: 'Custom branding', free: false, pro: true },
  { text: '720p resolution', free: true, pro: true },
  { text: 'Basic templates', free: true, pro: true },
  { text: 'Priority support', free: false, pro: false },
]

const freeFeatures = features.filter((f) => f.free !== undefined).map((f) => ({
  text: f.text,
  included: f.free,
})).filter((f) => f.text !== 'Unlimited videos' && f.text !== '4K resolution' && f.text !== 'Premium templates')

const proFeatures = features.filter((f) => f.pro !== undefined).map((f) => ({
  text: f.text,
  included: f.pro,
})).filter((f) => f.text !== '5 videos per month' && f.text !== '720p resolution' && f.text !== 'Basic templates')

export function Pricing({ user }: { user: User | null }) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month')
  const [loading, setLoading] = useState(false)

  const proPrice = billingInterval === 'month' ? '$29' : '$290'
  const proInterval = billingInterval === 'month' ? '/month' : '/year'

  async function handleProCheckout() {
    if (!user) {
      window.location.href = '/signup'
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: billingInterval }),
      })

      const { url, error } = await response.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoading(false)
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
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
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

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Free Tier */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Perfect for trying out VideoGen.</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {freeFeatures.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn('text-sm', !feature.included && 'text-muted-foreground')}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/signup">Get Started</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className="relative flex flex-col border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Most Popular
            </div>
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>For creators and small teams.</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{proPrice}</span>
                <span className="text-muted-foreground">{proInterval}</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {proFeatures.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn('text-sm', !feature.included && 'text-muted-foreground')}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleProCheckout} disabled={loading}>
                {loading ? 'Loading...' : 'Get Started'}
              </Button>
            </CardFooter>
          </Card>

          {/* Enterprise Tier */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>For organizations at scale.</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">Custom</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {[
                  'Unlimited videos',
                  '4K resolution',
                  'Premium templates',
                  'AI voiceover',
                  'Custom branding',
                  'Priority support',
                ].map((text) => (
                  <li key={text} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="mailto:sales@videogen.com">Contact Sales</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}
