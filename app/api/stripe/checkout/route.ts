import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { PLANS, type PlanId } from '@/lib/plans'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, interval } = await request.json()

    const validPlans: PlanId[] = ['starter', 'creator']
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Choose starter or creator.' }, { status: 400 })
    }

    if (!interval || !['month', 'year'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 })
    }

    const planConfig = PLANS[plan as PlanId]
    const priceId = interval === 'year'
      ? planConfig.stripePriceIds.yearly
      : planConfig.stripePriceIds.monthly

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 500 })
    }

    // Check for existing Stripe customer
    const { data: subscription } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let stripeCustomerId = subscription?.stripe_customer_id

    // Create Stripe customer if none exists
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      await getSupabaseAdmin().from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        plan: 'free',
        status: 'active',
      }, { onConflict: 'user_id' })
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/#pricing`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
