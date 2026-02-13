export type PlanId = 'free' | 'starter' | 'creator' | 'enterprise'

export interface PlanLimits {
  videosPerMonth: number | null // null = unlimited
  aiUsesPerMonth: number | null
  nanoBananaCredits: number
  maxResolution: '720p' | '1080p' | '4K'
  heygenAccess: boolean
  nanoBananaAccess: boolean
  ugcFeatures: boolean
  batchCreation: boolean
  prioritySupport: boolean
}

export interface PlanConfig {
  id: PlanId
  name: string
  description: string
  monthlyPrice: number | null // null = custom/contact
  yearlyPrice: number | null
  features: string[]
  limits: PlanLimits
  stripePriceIds: {
    monthly: string | null
    yearly: string | null
  }
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try VideoGen with 2 free AI Video credits',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '2 AI Video credits',
      '5 videos per month',
      '720p resolution',
      'Basic templates',
      'HeyGen video generation',
    ],
    limits: {
      videosPerMonth: 5,
      aiUsesPerMonth: 10,
      nanoBananaCredits: 2,
      maxResolution: '720p',
      heygenAccess: true,
      nanoBananaAccess: true,
      ugcFeatures: false,
      batchCreation: false,
      prioritySupport: false,
    },
    stripePriceIds: { monthly: null, yearly: null },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For individual creators getting started',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Unlimited HeyGen videos',
      '10 AI Video credits/month',
      '1080p resolution',
      'All templates',
      'AI script tools',
      'Smart editing suite',
      'Multi-language support',
    ],
    limits: {
      videosPerMonth: null,
      aiUsesPerMonth: null,
      nanoBananaCredits: 10,
      maxResolution: '1080p',
      heygenAccess: true,
      nanoBananaAccess: true,
      ugcFeatures: false,
      batchCreation: false,
      prioritySupport: false,
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? '',
      yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? '',
    },
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    description: 'AI Video Studio with Google Veo 3.1',
    monthlyPrice: 60,
    yearlyPrice: 600,
    features: [
      'Everything in Starter',
      '50 AI Video credits/month',
      'AI Video Studio (Veo 3.1)',
      'Ingredients to Video',
      'Shot Designer & Scene Extender',
      'Batch video creation',
      '4K resolution',
      'Advanced analytics',
    ],
    limits: {
      videosPerMonth: null,
      aiUsesPerMonth: null,
      nanoBananaCredits: 50,
      maxResolution: '4K',
      heygenAccess: true,
      nanoBananaAccess: true,
      ugcFeatures: true,
      batchCreation: true,
      prioritySupport: false,
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID ?? '',
      yearly: process.env.STRIPE_CREATOR_YEARLY_PRICE_ID ?? '',
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for organizations at scale',
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      'Everything in Creator',
      'Unlimited AI Video credits',
      'Custom branding',
      'Priority support',
      'Dedicated account manager',
      'SAML/SSO',
      'API access',
    ],
    limits: {
      videosPerMonth: null,
      aiUsesPerMonth: null,
      nanoBananaCredits: 9999,
      maxResolution: '4K',
      heygenAccess: true,
      nanoBananaAccess: true,
      ugcFeatures: true,
      batchCreation: true,
      prioritySupport: true,
    },
    stripePriceIds: { monthly: null, yearly: null },
  },
}

/** Map a Stripe price ID to our plan name */
export function getPlanFromPriceId(priceId: string): PlanId {
  for (const plan of Object.values(PLANS)) {
    if (
      (plan.stripePriceIds.monthly && plan.stripePriceIds.monthly === priceId) ||
      (plan.stripePriceIds.yearly && plan.stripePriceIds.yearly === priceId)
    ) {
      return plan.id
    }
  }
  // Legacy: map old Pro price IDs to starter
  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID
  ) {
    return 'starter'
  }
  return 'free'
}

/* ── Credit Packs (one-time purchases) ── */

export interface CreditPack {
  id: string
  credits: number
  price: number          // USD
  perCredit: number      // price per credit
  stripePriceId: string
  badge?: string
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_5',
    credits: 5,
    price: 10,
    perCredit: 2.00,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_PACK_5_PRICE_ID ?? '',
    badge: 'Starter',
  },
  {
    id: 'pack_25',
    credits: 25,
    price: 25,
    perCredit: 1.00,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_PACK_25_PRICE_ID ?? '',
  },
  {
    id: 'pack_50',
    credits: 50,
    price: 50,
    perCredit: 1.00,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_PACK_50_PRICE_ID ?? '',
  },
  {
    id: 'pack_100',
    credits: 100,
    price: 100,
    perCredit: 1.00,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_PACK_100_PRICE_ID ?? '',
  },
  {
    id: 'pack_500',
    credits: 500,
    price: 500,
    perCredit: 1.00,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_PACK_500_PRICE_ID ?? '',
    badge: 'Most Popular',
  },
]

/** Look up a credit pack by its Stripe price ID */
export function getCreditPackFromPriceId(priceId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.stripePriceId && p.stripePriceId === priceId)
}

/** Look up a credit pack by its pack ID */
export function getCreditPackById(packId: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === packId)
}

/** Recommend a plan based on onboarding answers */
export function recommendPlan(answers: {
  companySize: string
  creativesTested: string
  monthlyAdSpend: string
}): PlanId {
  const { companySize, creativesTested, monthlyAdSpend } = answers

  if (monthlyAdSpend === '1M+' || companySize === '100+') return 'enterprise'
  if (
    monthlyAdSpend === '100K-1M' ||
    creativesTested === '500+' ||
    creativesTested === '51-500'
  ) return 'creator'
  if (
    monthlyAdSpend === '20K-100K' ||
    creativesTested === '11-50' ||
    companySize === '6-50' ||
    companySize === '51-100'
  ) return 'starter'
  return 'free'
}
