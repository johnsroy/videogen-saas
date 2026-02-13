import Link from 'next/link'
import { PenLine, Wand2, Users, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = [
  {
    step: 1,
    icon: PenLine,
    title: 'Write Your Script',
    description: 'Type your ad script or let AI generate one from a topic. Choose tone, duration, and audience.',
  },
  {
    step: 2,
    icon: Users,
    title: 'Pick an AI Actor',
    description: 'Select from our library of diverse AI actors. Set emotion, style, and background to match your brand.',
  },
  {
    step: 3,
    icon: Wand2,
    title: 'AI Creates Your Ad',
    description: 'Our AI generates your video in minutes. UGC-style, product demo, testimonial — any format you need.',
  },
  {
    step: 4,
    icon: Rocket,
    title: 'Launch & Iterate',
    description: 'Export, share, or batch-create dozens of variations. Find your winning creative faster.',
  },
]

export function DemoShowcase() {
  return (
    <section id="demo" className="border-t bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From script to ad in minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create professional AI ads in four simple steps.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {item.step}
              </div>
              <div className="mt-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-background border">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/signup">Start Creating Ads</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
