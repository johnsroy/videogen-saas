import { Header } from '@/components/landing/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Subtle animated gradient background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03] animate-gradient-bg"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
          backgroundSize: '200% 200%',
        }}
      />
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
