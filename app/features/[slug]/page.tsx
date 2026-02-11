import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Check } from 'lucide-react'
import { getFeatureBySlug } from '@/lib/features'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const feature = getFeatureBySlug(slug)
  if (!feature) return { title: 'Feature Not Found' }
  return {
    title: `${feature.title} - VideoGen`,
    description: feature.longDescription,
  }
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const feature = getFeatureBySlug(slug)

  if (!feature) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ctaHref = user ? '/dashboard' : '/signup'

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="sm" className="mb-8">
            <Link href="/#features">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to features
            </Link>
          </Button>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {feature.title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {feature.longDescription}
              </p>
              <Button asChild size="lg" className="w-fit">
                <Link href={ctaHref}>Get Started</Link>
              </Button>
            </div>

            <div className="flex items-center justify-center">
              <div className="h-72 w-full rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border flex items-center justify-center">
                <feature.icon className="h-20 w-20 text-primary/30" />
              </div>
            </div>
          </div>

          <div className="mt-20">
            <h2 className="text-2xl font-bold tracking-tight">What you can do</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {feature.showcaseItems.map((item) => (
                <Card key={item}>
                  <CardContent className="flex items-start gap-3 pt-6">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm">{item}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Ready to get started?</h2>
            <p className="mt-2 text-muted-foreground">
              Create your first AI-powered video in minutes.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href={ctaHref}>{user ? 'Go to Dashboard' : 'Start Free'}</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
