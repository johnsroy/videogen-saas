'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Video, Sparkles, Globe, BarChart3, Film, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Create', icon: Video },
  { href: '/dashboard/ugc', label: 'AI Video Studio', icon: Film },
  { href: '/dashboard/smart-editing', label: 'Smart Editing', icon: Sparkles },
  { href: '/dashboard/translate', label: 'Translate', icon: Globe },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/usage', label: 'Usage', icon: Zap },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <div className="mb-8 border-b">
      <nav className="-mb-px flex gap-4">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
