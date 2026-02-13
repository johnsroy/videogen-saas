import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { recommendPlan } from '@/lib/plans'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { company_size, creatives_tested, monthly_ad_spend } = body

    if (!company_size || !creatives_tested || !monthly_ad_spend) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const recommended = recommendPlan({
      companySize: company_size,
      creativesTested: creatives_tested,
      monthlyAdSpend: monthly_ad_spend,
    })

    const { error: dbError } = await getSupabaseAdmin()
      .from('onboarding_profiles')
      .upsert({
        user_id: user.id,
        company_size,
        creatives_tested,
        monthly_ad_spend,
        recommended_plan: recommended,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Onboarding save error:', dbError)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    return NextResponse.json({ recommended_plan: recommended })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
