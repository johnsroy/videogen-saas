import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Video, Sparkles, Wand2 } from 'lucide-react'

export function Hero() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Create stunning videos with{' '}
            <span className="text-primary">AI</span>
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Transform your ideas into professional videos in minutes. No editing skills required.
            Powered by cutting-edge AI technology.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative h-80 w-full max-w-md rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border p-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Video className="h-8 w-8 text-primary" />
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3">
                    <Wand2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="mt-2 h-2 w-48 rounded-full bg-primary/20">
                  <div className="h-full w-3/4 rounded-full bg-primary/50" />
                </div>
                <p className="text-sm text-muted-foreground">AI-powered video generation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
