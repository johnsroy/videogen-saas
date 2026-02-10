import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Tier {
  name: string
  price: string
  description: string
  features: { text: string; included: boolean }[]
  cta: string
  href: string
  highlighted: boolean
}

const tiers: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out VideoGen.',
    features: [
      { text: '5 videos per month', included: true },
      { text: '720p resolution', included: true },
      { text: 'Basic templates', included: true },
      { text: 'AI voiceover', included: false },
      { text: 'Custom branding', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For creators and small teams.',
    features: [
      { text: 'Unlimited videos', included: true },
      { text: '4K resolution', included: true },
      { text: 'Premium templates', included: true },
      { text: 'AI voiceover', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For organizations at scale.',
    features: [
      { text: 'Unlimited videos', included: true },
      { text: '4K resolution', included: true },
      { text: 'Premium templates', included: true },
      { text: 'AI voiceover', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@videogen.com',
    highlighted: false,
  },
]

export function Pricing() {
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
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                'flex flex-col',
                tier.highlighted && 'border-primary shadow-lg relative'
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.price !== 'Custom' && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span
                        className={cn(
                          'text-sm',
                          !feature.included && 'text-muted-foreground'
                        )}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  variant={tier.highlighted ? 'default' : 'outline'}
                  className="w-full"
                >
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
