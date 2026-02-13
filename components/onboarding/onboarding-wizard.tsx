'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PLANS, type PlanId } from '@/lib/plans'
import { ArrowRight, ArrowLeft, Check, Building2, BarChart3, DollarSign, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingWizardProps {
  userEmail: string
}

const STEPS = [
  {
    id: 'company_size',
    title: 'Tell us about your team',
    description: 'How many people are in your organization?',
    icon: Building2,
    options: [
      { value: '1-5', label: '1–5', description: 'Solo or small team' },
      { value: '6-50', label: '6–50', description: 'Growing team' },
      { value: '51-100', label: '51–100', description: 'Mid-size company' },
      { value: '100+', label: '100+', description: 'Enterprise' },
    ],
  },
  {
    id: 'creatives_tested',
    title: 'Creative volume',
    description: 'How many ad creatives did you test last month?',
    icon: BarChart3,
    options: [
      { value: '0-10', label: '0–10', description: 'Just getting started' },
      { value: '11-50', label: '11–50', description: 'Regular testing' },
      { value: '51-500', label: '51–500', description: 'Scaling up' },
      { value: '500+', label: '500+', description: 'High volume' },
    ],
  },
  {
    id: 'monthly_ad_spend',
    title: 'Monthly ad spend',
    description: 'What is your approximate monthly ad budget?',
    icon: DollarSign,
    options: [
      { value: '<20K', label: 'Under $20K', description: 'Starting out' },
      { value: '20K-100K', label: '$20K–$100K', description: 'Growing spend' },
      { value: '100K-1M', label: '$100K–$1M', description: 'Significant budget' },
      { value: '1M+', label: '$1M+', description: 'Enterprise scale' },
    ],
  },
] as const

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'creator', 'enterprise']

export function OnboardingWizard({ userEmail }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [recommendedPlan, setRecommendedPlan] = useState<PlanId | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<PlanId | null>(null)

  const currentStep = step < STEPS.length ? STEPS[step] : null
  const isRecommendationStep = step === STEPS.length
  const progress = ((step + 1) / (STEPS.length + 1)) * 100

  function selectOption(value: string) {
    if (!currentStep) return
    setAnswers({ ...answers, [currentStep.id]: value })
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }

    // Submit answers and get recommendation
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      const data = await res.json()
      if (res.ok) {
        setRecommendedPlan(data.recommended_plan)
        setStep(STEPS.length) // Move to recommendation step
      }
    } catch (err) {
      console.error('Onboarding error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePlanSelect(plan: PlanId) {
    if (plan === 'free' || plan === 'enterprise') {
      router.push('/dashboard')
      return
    }

    setCheckoutLoading(plan)
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
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Step {step + 1} of {STEPS.length + 1}
        </p>
      </div>

      {/* Question steps */}
      {currentStep && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <currentStep.icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
            <CardDescription className="text-base">{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {currentStep.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => selectOption(option.value)}
                  className={cn(
                    'flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50',
                    answers[currentStep.id] === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <span className="text-lg font-semibold">{option.label}</span>
                  <span className="text-sm text-muted-foreground">{option.description}</span>
                  {answers[currentStep.id] === option.value && (
                    <Check className="mt-2 h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!answers[currentStep.id] || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    {step === STEPS.length - 1 ? 'See Recommendation' : 'Continue'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation step */}
      {isRecommendationStep && recommendedPlan && (
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Your personalized plan</h2>
            <p className="mt-1 text-muted-foreground">
              Based on your answers, we recommend the <strong className="text-primary">{PLANS[recommendedPlan].name}</strong> plan
            </p>
          </div>

          <div className="grid gap-4">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId]
              const isRecommended = planId === recommendedPlan
              return (
                <Card
                  key={planId}
                  className={cn(
                    'relative transition-all',
                    isRecommended && 'border-primary shadow-md'
                  )}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                      Recommended
                    </div>
                  )}
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plan.name}</h3>
                        {plan.monthlyPrice !== null ? (
                          <span className="text-lg font-bold">
                            ${plan.monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">Custom pricing</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{plan.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {plan.features.slice(0, 3).map((f) => (
                          <span key={f} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                            <Check className="mr-1 h-3 w-3 text-primary" />
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="ml-4 shrink-0"
                      variant={isRecommended ? 'default' : 'outline'}
                      disabled={checkoutLoading !== null}
                      onClick={() => handlePlanSelect(planId)}
                    >
                      {checkoutLoading === planId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : planId === 'free' ? (
                        'Start Free'
                      ) : planId === 'enterprise' ? (
                        'Contact Sales'
                      ) : (
                        'Get Started'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Button
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => setStep(STEPS.length - 1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to questions
          </Button>
        </div>
      )}
    </div>
  )
}
