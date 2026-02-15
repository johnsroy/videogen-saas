import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Play, ArrowRight, Sparkles } from 'lucide-react'
import { RotatingHeroContent } from './rotating-hero-text'
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

      {/* Floating gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[15%] h-64 w-64 rounded-full bg-primary/[0.04] blur-3xl animate-float-orb" />
        <div className="absolute top-32 right-[10%] h-48 w-48 rounded-full bg-primary/[0.06] blur-3xl animate-float-orb-slow" />
        <div className="absolute bottom-10 left-[40%] h-56 w-56 rounded-full bg-primary/[0.03] blur-3xl animate-float-orb" style={{ animationDelay: '-8s' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Powered by AI Actors & Google Veo 3.1</span>
          </div>

          {/* Headline + Subheadline with rotating words */}
          <RotatingHeroContent />

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href={user ? '/dashboard' : '/signup'}>
                Create Your AI Ad
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link href="#interactive-demo">
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

        {/* Scroll indicator */}
        <div className="mt-12 flex justify-center">
          <div className="animate-bounce text-muted-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
