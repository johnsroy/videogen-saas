import { Users, Video, Zap, Globe } from 'lucide-react'

const stats = [
  { label: 'Videos Created', value: '50K+', icon: Video },
  { label: 'Active Creators', value: '2,500+', icon: Users },
  { label: 'Avg. Render Time', value: '<3 min', icon: Zap },
  { label: 'Languages', value: '50+', icon: Globe },
]

export function SocialProof() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold tracking-tight sm:text-3xl">{stat.value}</span>
              <span className="mt-1 text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
