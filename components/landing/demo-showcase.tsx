import Link from 'next/link'
import { Video, Wand2, Share2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = [
  {
    step: 1,
    icon: Video,
    title: 'Describe Your Video',
    description: 'Type a text prompt describing the video you want to create. Be as detailed or simple as you like.',
  },
  {
    step: 2,
    icon: Wand2,
    title: 'AI Generates It',
    description: 'Our AI creates professional video content from your description in just minutes.',
  },
  {
    step: 3,
    icon: Share2,
    title: 'Export & Share',
    description: 'Download in any format or share directly to your favorite social platforms.',
  },
]

export function DemoShowcase() {
  return (
    <section id="demo" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create professional videos in three simple steps.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {item.step}
              </div>
              <div className="mt-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center">
          <div className="flex h-64 w-full max-w-3xl items-center justify-center rounded-2xl border bg-muted/50">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Watch Demo</p>
            </div>
          </div>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">Start Creating Videos</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
