import { ShoppingBag, Monitor, Share2, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const useCases = [
  {
    icon: ShoppingBag,
    title: 'E-commerce Ads',
    description: 'Create scroll-stopping product ads with AI actors that showcase your products authentically. Test hundreds of variations at a fraction of the cost.',
  },
  {
    icon: Monitor,
    title: 'SaaS Demos',
    description: 'Generate professional product demos and walkthroughs with AI presenters. Perfect for onboarding, feature launches, and sales enablement.',
  },
  {
    icon: Share2,
    title: 'Social Media UGC',
    description: 'Produce authentic-looking UGC-style content for TikTok, Instagram Reels, and YouTube Shorts. Scale your social presence without hiring creators.',
  },
  {
    icon: Star,
    title: 'Product Reviews',
    description: 'Generate realistic product review videos with diverse AI actors. Test messaging, angles, and hooks to find your winning creative.',
  },
]

export function UseCases() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for every use case
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From direct-to-consumer ads to enterprise demos, VideoGen powers it all.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {useCases.map((uc) => (
            <Card key={uc.title} className="group transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <uc.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>{uc.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{uc.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
