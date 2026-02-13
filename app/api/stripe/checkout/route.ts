import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { PLANS, type PlanId, getCreditPackById } from '@/lib/plans'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = body

    // ── Credit pack purchase (one-time) ──
    if (type === 'credit_pack') {
      const { packId } = body
      const pack = getCreditPackById(packId)
      if (!pack) {
        return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 })
      }
      if (!pack.stripePriceId) {
        return NextResponse.json({ error: 'Credit pack price not configured' }, { status: 500 })
      }

      // Ensure Stripe customer exists
      const stripeCustomerId = await ensureStripeCustomer(user.id, user.email!)

      const origin = request.headers.get('origin') || 'http://localhost:3000'

      const checkoutSession = await getStripe().checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'payment',
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        success_url: `${origin}/dashboard/usage?checkout=credits_success`,
        cancel_url: `${origin}/dashboard/usage`,
        metadata: {
          supabase_user_id: user.id,
          type: 'credit_pack',
          pack_id: pack.id,
          credits: String(pack.credits),
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // ── Subscription checkout ──
    const { plan, interval } = body

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

    const stripeCustomerId = await ensureStripeCustomer(user.id, user.email!)

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

/** Ensure a Stripe customer exists for the user, return customer ID */
async function ensureStripeCustomer(userId: string, email: string): Promise<string> {
  const { data: subscription } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await getSupabaseAdmin().from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    plan: 'free',
    status: 'active',
  }, { onConflict: 'user_id' })

  return customer.id
}
