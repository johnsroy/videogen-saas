import { getSupabaseAdmin } from './supabase/admin'
import { PLANS, type PlanId } from './plans'

export interface CreditBalance {
  remaining: number
  total: number
  periodEnd: string
}

/** Get user's current credit balance */
export async function getUserCreditBalance(userId: string): Promise<CreditBalance> {
  const { data } = await getSupabaseAdmin()
    .from('credit_balances')
    .select('credits_remaining, credits_total, period_end')
    .eq('user_id', userId)
    .single()

  return {
    remaining: data?.credits_remaining ?? 0,
    total: data?.credits_total ?? 0,
    periodEnd: data?.period_end ?? new Date().toISOString(),
  }
}

/** Consume credits. Returns success and remaining balance. */
export async function consumeCredits(params: {
  userId: string
  amount: number
  resourceType: string
  resourceId: string
  description?: string
}): Promise<{ success: boolean; remaining: number }> {
  const { userId, amount, resourceType, resourceId, description } = params

  // Check current balance
  const { data: bal } = await getSupabaseAdmin()
    .from('credit_balances')
    .select('credits_remaining')
    .eq('user_id', userId)
    .single()

  if (!bal || bal.credits_remaining < amount) {
    return { success: false, remaining: bal?.credits_remaining ?? 0 }
  }

  const newRemaining = bal.credits_remaining - amount

  // Deduct credits
  await getSupabaseAdmin()
    .from('credit_balances')
    .update({
      credits_remaining: newRemaining,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  // Log transaction
  await getSupabaseAdmin()
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      balance_after: newRemaining,
      type: 'consumption',
      resource_type: resourceType,
      resource_id: resourceId,
      description,
    })

  return { success: true, remaining: newRemaining }
}

/** Allocate credits for a plan (used on subscription creation/renewal) */
export async function allocateCredits(userId: string, plan: PlanId): Promise<void> {
  const credits = PLANS[plan]?.limits.nanoBananaCredits ?? 2
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  const { data: existing } = await getSupabaseAdmin()
    .from('credit_balances')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    await getSupabaseAdmin()
      .from('credit_balances')
      .update({
        credits_remaining: credits,
        credits_total: credits,
        period_start: new Date().toISOString(),
        period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  } else {
    await getSupabaseAdmin()
      .from('credit_balances')
      .insert({
        user_id: userId,
        credits_remaining: credits,
        credits_total: credits,
        period_end: periodEnd.toISOString(),
      })
  }

  // Log allocation transaction
  await getSupabaseAdmin()
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: credits,
      balance_after: credits,
      type: 'allocation',
      description: `${plan} plan credit allocation`,
    })
}

/** Grant signup bonus credits */
export async function grantSignupBonus(userId: string): Promise<void> {
  const SIGNUP_BONUS = 2
  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + 30)

  const { data: existing } = await getSupabaseAdmin()
    .from('credit_balances')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!existing) {
    await getSupabaseAdmin()
      .from('credit_balances')
      .insert({
        user_id: userId,
        credits_remaining: SIGNUP_BONUS,
        credits_total: SIGNUP_BONUS,
        period_end: periodEnd.toISOString(),
      })

    await getSupabaseAdmin()
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: SIGNUP_BONUS,
        balance_after: SIGNUP_BONUS,
        type: 'bonus',
        description: 'Signup bonus - 2 free AI Video credits',
      })
  }
}

/** Refund credits (for cancelled/timed-out generations). */
export async function refundCredits(params: {
  userId: string
  amount: number
  resourceId: string
  reason: string
}): Promise<{ success: boolean; remaining: number }> {
  const { userId, amount, resourceId, reason } = params

  const { data: bal } = await getSupabaseAdmin()
    .from('credit_balances')
    .select('credits_remaining')
    .eq('user_id', userId)
    .single()

  const newRemaining = (bal?.credits_remaining ?? 0) + amount

  await getSupabaseAdmin()
    .from('credit_balances')
    .update({
      credits_remaining: newRemaining,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  await getSupabaseAdmin()
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount,
      balance_after: newRemaining,
      type: 'refund',
      resource_type: 'veo_video',
      resource_id: resourceId,
      description: reason,
    })

  return { success: true, remaining: newRemaining }
}

/** Calculate credit cost for a NanoBanana video (legacy) */
export function calculateVideoCreditCost(durationSec: number): number {
  return Math.max(1, Math.ceil(durationSec / 10))
}

/** Calculate credit cost for a NanoBanana image */
export function calculateImageCreditCost(resolution: string): number {
  const costs: Record<string, number> = { '1K': 1, '2K': 2, '4K': 3 }
  return costs[resolution] ?? 1
}

/** Calculate credit cost for a Veo 3.1 video.
 * Standard model: 2 credits/sec, Fast/draft model: 1 credit/sec */
export function calculateVeoVideoCreditCost(
  durationSec: number,
  model: string = 'veo-3.1-generate-preview'
): number {
  const rate = model === 'veo-3.1-fast-generate-preview' ? 1 : 2
  return Math.max(1, Math.ceil(durationSec * rate))
}
