import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/landing/header'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { DemoShowcase } from '@/components/landing/demo-showcase'
import { Pricing } from '@/components/landing/pricing'
import { Footer } from '@/components/landing/footer'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero user={user} />
        <Features />
        <DemoShowcase />
        <Pricing user={user} />
      </main>
      <Footer />
    </div>
  )
}
