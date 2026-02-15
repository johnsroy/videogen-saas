import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/landing/header'
import {
  ArrowRight,
  Sparkles,
  Shield,
  Users,
  Zap,
  Globe,
  HeadphonesIcon,
  BarChart3,
  Video,
  Clock,
  Coins,
} from 'lucide-react'

export const metadata = {
  title: 'Enterprise | VideoGen',
  description: 'AI video generation at scale. Unlimited credits, custom avatars, API access, and dedicated support for your team.',
}

const STATS = [
  { value: '10M+', label: 'Videos Generated', icon: Video },
  { value: '99.9%', label: 'Uptime SLA', icon: Clock },
  { value: '50+', label: 'Languages Supported', icon: Globe },
  { value: '<2min', label: 'Average Render Time', icon: Zap },
]

const FEATURES = [
  {
    icon: Coins,
    title: 'Unlimited Credits',
    description: 'No caps on AI video generation. Scale your content production without worrying about credits or quotas.',
  },
  {
    icon: Users,
    title: 'Custom AI Avatars',
    description: 'Create branded AI presenters trained on your team. Consistent look and feel across all your videos.',
  },
  {
    icon: BarChart3,
    title: 'API Access',
    description: 'Full REST API to integrate video generation into your existing workflows, CMS, or marketing automation.',
  },
  {
    icon: Shield,
    title: 'SSO & Security',
    description: 'Enterprise-grade security with SAML SSO, role-based access control, and SOC 2 compliance.',
  },
  {
    icon: Zap,
    title: 'Priority Rendering',
    description: 'Jump the queue with dedicated rendering infrastructure. Your videos are processed first, every time.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'A dedicated account manager, priority support channel, and custom onboarding for your team.',
  },
]

const TESTIMONIALS = [
  {
    quote: 'VideoGen helped us produce 500+ product videos in a single quarter. What used to take weeks now takes minutes.',
    name: 'Sarah Chen',
    role: 'VP of Marketing, TechCorp',
    initials: 'SC',
  },
  {
    quote: 'The API integration was seamless. We generate personalized video ads at scale directly from our CRM data.',
    name: 'Marcus Rivera',
    role: 'Head of Growth, ScaleUp Inc',
    initials: 'MR',
  },
  {
    quote: 'Enterprise support has been exceptional. Our dedicated account manager understands our needs and delivers results.',
    name: 'Elena Kowalski',
    role: 'Creative Director, BrandHouse',
    initials: 'EK',
  },
]

export default function EnterprisePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />

        {/* Floating orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl animate-[float-orb_20s_ease-in-out_infinite]" />
          <div className="absolute top-40 right-1/4 h-56 w-56 rounded-full bg-primary/8 blur-3xl animate-[float-orb_25s_ease-in-out_infinite_reverse]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Built for teams that move fast</span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              AI Video Generation{' '}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                for Enterprise
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Unlimited credits, custom avatars, API access, and dedicated support.
              Scale your video content production from hundreds to millions.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link href="mailto:enterprise@videogen.ai">
                  Contact Sales
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <Link href="/#pricing">
                  View Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need at scale
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Enterprise-grade tools and infrastructure to power your video content strategy.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trusted by leading teams
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border bg-card p-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to scale your video production?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get a custom plan tailored to your team&apos;s needs. Volume pricing, dedicated support, and custom integrations.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="mailto:enterprise@videogen.ai">
                Contact Sales
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link href="/signup">
                Start Free Trial
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <span className="font-bold">VideoGen</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} VideoGen. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
