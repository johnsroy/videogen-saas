import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { grantSignupBonus } from '@/lib/credits'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if onboarding is completed
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Grant signup bonus credits (idempotent — only if no balance exists)
        await grantSignupBonus(user.id)

        const { data: profile } = await supabase
          .from('onboarding_profiles')
          .select('completed_at')
          .eq('user_id', user.id)
          .single()

        if (!profile?.completed_at) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/error`)
}
