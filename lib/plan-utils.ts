import { PLANS, type PlanId } from './plans'

export function getPlanLimits(plan: PlanId) {
  return PLANS[plan]?.limits ?? PLANS.free.limits
}

export function canGenerateVideo(plan: PlanId, videosThisMonth: number): boolean {
  const limits = getPlanLimits(plan)
  return limits.videosPerMonth === null || videosThisMonth < limits.videosPerMonth
}

export function getVideoLimit(plan: PlanId): number | null {
  return getPlanLimits(plan).videosPerMonth
}

export function canUseAI(plan: PlanId, aiUsageThisMonth: number): boolean {
  const limits = getPlanLimits(plan)
  return limits.aiUsesPerMonth === null || aiUsageThisMonth < limits.aiUsesPerMonth
}

export function getAILimit(plan: PlanId): number | null {
  return getPlanLimits(plan).aiUsesPerMonth
}

export function hasUGCAccess(plan: PlanId): boolean {
  return getPlanLimits(plan).ugcFeatures
}

export function isPaidPlan(plan: PlanId): boolean {
  return plan !== 'free'
}

export function getEffectivePlan(plan: string | undefined, status: string | undefined): PlanId {
  const validPlans: PlanId[] = ['free', 'starter', 'creator', 'enterprise']
  const p = (plan ?? 'free') as PlanId
  if (!validPlans.includes(p)) {
    // Legacy 'pro' maps to 'starter'
    if (plan === 'pro') return status === 'active' ? 'starter' : 'free'
    return 'free'
  }
  return status === 'active' ? p : 'free'
}

export function getPlanDisplayName(plan: PlanId): string {
  return PLANS[plan]?.name ?? 'Free'
}

export function getMaxResolution(plan: PlanId): string {
  return getPlanLimits(plan).maxResolution
}

/** Whether the user has access to AI Video Studio (Veo 3.1) — Creator+ */
export function canUseVeo(plan: PlanId): boolean {
  return getPlanLimits(plan).ugcFeatures
}

/** Whether the user can extend videos — Creator+ */
export function canUseVideoExtension(plan: PlanId): boolean {
  return getPlanLimits(plan).ugcFeatures
}

/** Whether the user can use draft/fast mode — Creator+ */
export function canUseDraftMode(plan: PlanId): boolean {
  return getPlanLimits(plan).ugcFeatures
}

/** Max Veo resolution for plan */
export function getMaxVeoResolution(plan: PlanId): '720p' | '1080p' {
  const res = getPlanLimits(plan).maxResolution
  // Veo supports up to 1080p; map 4K → 1080p
  return res === '720p' ? '720p' : '1080p'
}
