import { Video, Sparkles, Zap, Globe, Shield, BarChart3, type LucideIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: Video,
    title: 'AI Video Creation',
    description: 'Generate professional videos from text prompts. Just describe what you want and let AI do the rest.',
  },
  {
    icon: Sparkles,
    title: 'Smart Editing',
    description: 'Automatically enhance your videos with AI-powered color correction, transitions, and effects.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Render videos in minutes, not hours. Our infrastructure is optimized for speed and quality.',
  },
  {
    icon: Globe,
    title: 'Multi-Language',
    description: 'Create videos in 50+ languages with natural-sounding AI voiceovers and subtitles.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption. Your content is safe and private.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track video performance with built-in analytics. Understand your audience and optimize.',
  },
]

export function Features() {
  return (
    <section id="features" className="border-t bg-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to create amazing videos
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features to help you produce professional content at scale.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
