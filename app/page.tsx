import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/landing/header'
import { Hero } from '@/components/landing/hero'
import { InteractiveDemo } from '@/components/landing/interactive-demo'
import { SocialProof } from '@/components/landing/social-proof'
import { Features } from '@/components/landing/features'
import { UseCases } from '@/components/landing/use-cases'
import { DemoShowcase } from '@/components/landing/demo-showcase'
import { Pricing } from '@/components/landing/pricing'
import { Footer } from '@/components/landing/footer'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in users go straight to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero user={null} />
        <InteractiveDemo />
        <SocialProof />
        <UseCases />
        <Features />
        <DemoShowcase />
        <Pricing user={null} />
      </main>
      <Footer />
    </div>
  )
}
