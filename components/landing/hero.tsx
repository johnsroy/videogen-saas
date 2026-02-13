import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Play, ArrowRight, Sparkles } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface HeroProps {
  user: User | null
}

export function Hero({ user }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background grid + gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--muted))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Powered by AI Actors & Google Veo 3.1</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Create winning ads{' '}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              with AI
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Use our library of AI Actors, or create your own AI Avatar.
            Generate UGC-style ads at scale — no actors, no studios, no limits.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href={user ? '/dashboard' : '/signup'}>
                Create Your AI Ad
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link href="#demo">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Link>
            </Button>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-sm text-muted-foreground">
            No credit card required. 2 free AI video credits included.
          </p>
        </div>

        {/* Floating video thumbnails grid */}
        <div className="mt-16 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:gap-6">
          {[
            { label: 'Product Demo', color: 'from-blue-500/20 to-blue-600/10' },
            { label: 'UGC Testimonial', color: 'from-pink-500/20 to-pink-600/10' },
            { label: 'E-commerce Ad', color: 'from-green-500/20 to-green-600/10' },
            { label: 'Social Reel', color: 'from-purple-500/20 to-purple-600/10' },
            { label: 'Explainer', color: 'from-orange-500/20 to-orange-600/10' },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`aspect-[9/16] rounded-xl bg-gradient-to-br ${item.color} border flex flex-col items-center justify-center p-3 transition-transform hover:scale-105 ${i >= 3 ? 'hidden sm:flex' : ''}`}
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <div className="h-8 w-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center mb-2">
                <Play className="h-4 w-4 text-foreground/70" />
              </div>
              <span className="text-xs font-medium text-foreground/70 text-center">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
