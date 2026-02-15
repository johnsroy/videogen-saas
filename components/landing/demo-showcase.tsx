import Link from 'next/link'
import { PenLine, Wand2, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = [
  {
    step: 1,
    icon: PenLine,
    title: 'Describe Your Vision',
    description: 'Type a prompt, write a script, or upload product photos. AI understands exactly what you need.',
  },
  {
    step: 2,
    icon: Wand2,
    title: 'AI Generates Your Video',
    description: 'Choose an AI actor, pick a template, or let AI create from scratch. Ready in minutes, not hours.',
  },
  {
    step: 3,
    icon: Rocket,
    title: 'Export & Scale',
    description: 'Add captions, voiceover, and music. Export in 4K, create batch variations, and launch across platforms.',
  },
]

export function DemoShowcase() {
  return (
    <section id="demo" className="border-t bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From idea to video in 3 steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No filming, no editing skills, no expensive agencies.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {item.step}
              </div>
              <div className="mt-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-background border">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/signup">Start Creating for Free</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
