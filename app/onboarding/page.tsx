import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if onboarding already completed
  const { data: profile } = await supabase
    .from('onboarding_profiles')
    .select('completed_at')
    .eq('user_id', user.id)
    .single()

  if (profile?.completed_at) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <OnboardingWizard userEmail={user.email ?? ''} />
    </div>
  )
}
