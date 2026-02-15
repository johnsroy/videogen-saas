import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UserNav } from './user-nav'
import { Video } from 'lucide-react'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let plan: string | null = null
  if (user) {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single()
    plan = data?.plan ?? null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">VideoGen</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/enterprise" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Enterprise
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
        </nav>

        <UserNav user={user} plan={plan} />
      </div>
    </header>
  )
}
