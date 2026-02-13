'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PLANS, type PlanId } from '@/lib/plans'
import { Check, ArrowUpRight, Loader2, Coins } from 'lucide-react'

type UpgradeReason = 'video_limit' | 'ai_limit' | 'credits_exhausted' | 'ugc_access' | 'veo_access' | 'video_extension'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: UpgradeReason
  currentPlan: PlanId
}

const REASON_CONFIG: Record<UpgradeReason, { title: string; description: string; suggestedPlan: PlanId }> = {
  video_limit: {
    title: 'Video limit reached',
    description: 'You\'ve used all your free videos this month. Upgrade for unlimited video generation.',
    suggestedPlan: 'starter',
  },
  ai_limit: {
    title: 'AI usage limit reached',
    description: 'You\'ve used all your free AI enhancements this month. Upgrade for unlimited AI features.',
    suggestedPlan: 'starter',
  },
  credits_exhausted: {
    title: 'AI Video credits exhausted',
    description: 'You\'ve used all your AI Video credits. Upgrade your plan or buy a credit pack.',
    suggestedPlan: 'creator',
  },
  ugc_access: {
    title: 'AI Video Studio requires Creator plan',
    description: 'Full AI Video Studio with Google Veo 3.1 requires the Creator plan.',
    suggestedPlan: 'creator',
  },
  veo_access: {
    title: 'Unlock AI Video Studio',
    description: 'Create stunning videos with Google Veo 3.1 — ingredients-to-video, shot design, scene extension, and more.',
    suggestedPlan: 'creator',
  },
  video_extension: {
    title: 'Video Extension requires Creator plan',
    description: 'Extend your AI videos to create longer scenes. Available on Creator and Enterprise plans.',
    suggestedPlan: 'creator',
  },
}

export function UpgradeModal({ open, onOpenChange, reason, currentPlan }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const config = REASON_CONFIG[reason]
  const suggestedPlan = PLANS[config.suggestedPlan]

  // Only show plans higher than current
  const upgradePlans = (['starter', 'creator'] as PlanId[]).filter((p) => {
    const order: Record<PlanId, number> = { free: 0, starter: 1, creator: 2, enterprise: 3 }
    return order[p] > order[currentPlan]
  })

  async function handleUpgrade(plan: PlanId) {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: 'month' }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setLoading(null)
    }
  }

  async function handleBuyCredits(packId: string) {
    setLoading(packId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'credit_pack', packId }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err) {
      console.error('Credit pack checkout error:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {reason === 'credits_exhausted' && (
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Coins className="h-4 w-4 text-primary" />
                Quick top-up
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pack_25', credits: 25, price: '$9.99' },
                  { id: 'pack_50', credits: 50, price: '$17.99' },
                ].map((pack) => (
                  <Button
                    key={pack.id}
                    size="sm"
                    variant="outline"
                    className="h-auto flex-col gap-0.5 py-2"
                    onClick={() => handleBuyCredits(pack.id)}
                    disabled={loading !== null}
                  >
                    {loading === pack.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <span className="font-semibold">{pack.credits} credits</span>
                        <span className="text-[10px] text-muted-foreground">{pack.price}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                One-time purchase, no subscription needed
              </p>
            </div>
          )}

          {upgradePlans.map((planId) => {
            const plan = PLANS[planId]
            const isSuggested = planId === config.suggestedPlan
            return (
              <div
                key={planId}
                className={`rounded-lg border p-4 ${isSuggested ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {plan.name}
                      {isSuggested && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          Recommended
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      ${plan.monthlyPrice}/mo
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isSuggested ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(planId)}
                    disabled={loading !== null}
                  >
                    {loading === planId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Upgrade
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
                <ul className="mt-2 space-y-1">
                  {plan.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
