'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, Loader2, Sparkles, Zap } from 'lucide-react'

const CREDIT_PACKS = [
  { id: 'pack_5', credits: 5, price: 10, perCredit: '$2.00', badge: 'Starter' },
  { id: 'pack_25', credits: 25, price: 25, perCredit: '$1.00' },
  { id: 'pack_50', credits: 50, price: 50, perCredit: '$1.00' },
  { id: 'pack_100', credits: 100, price: 100, perCredit: '$1.00' },
  { id: 'pack_500', credits: 500, price: 500, perCredit: '$1.00', badge: 'Most Popular' },
  { id: 'pack_1000', credits: 1000, price: 1000, perCredit: '$1.00', badge: 'Best Value', xlarge: true },
  { id: 'pack_2500', credits: 2500, price: 2500, perCredit: '$1.00', xlarge: true },
  { id: 'pack_5000', credits: 5000, price: 5000, perCredit: '$1.00', badge: 'Enterprise', xlarge: true },
]

export function CreditPurchase() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy(packId: string) {
    setLoading(packId)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'credit_pack', packId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create checkout')
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const standardPacks = CREDIT_PACKS.filter((p) => !p.xlarge)
  const xlargePacks = CREDIT_PACKS.filter((p) => p.xlarge)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Buy More Credits
        </CardTitle>
        <CardDescription>
          Need more AI Video credits? Purchase a one-time credit pack.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Standard packs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {standardPacks.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm ${
                pack.badge ? 'border-primary bg-primary/5' : ''
              }`}
            >
              {pack.badge && (
                <Badge className="absolute -top-2.5 text-[10px]">
                  {pack.badge}
                </Badge>
              )}
              <div className="flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{pack.credits}</span>
              </div>
              <p className="text-xs text-muted-foreground">credits</p>
              <p className="text-lg font-semibold">${pack.price}</p>
              <p className="text-[10px] text-muted-foreground">{pack.perCredit}/credit</p>
              <Button
                size="sm"
                className="mt-1 w-full"
                variant={pack.badge ? 'default' : 'outline'}
                onClick={() => handleBuy(pack.id)}
                disabled={loading !== null}
              >
                {loading === pack.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Buy'
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* XLarge / Volume packs */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium">Volume Packs — For Long-Form & XLarge Videos</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {xlargePacks.map((pack) => (
              <div
                key={pack.id}
                className={`relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm ${
                  pack.badge === 'Enterprise'
                    ? 'border-violet-400 bg-gradient-to-b from-violet-50 to-transparent dark:border-violet-600 dark:from-violet-950'
                    : pack.badge
                      ? 'border-primary bg-primary/5'
                      : ''
                }`}
              >
                {pack.badge && (
                  <Badge
                    className={`absolute -top-2.5 text-[10px] ${
                      pack.badge === 'Enterprise'
                        ? 'bg-violet-600 hover:bg-violet-700'
                        : ''
                    }`}
                  >
                    {pack.badge}
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">{pack.credits.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">credits</p>
                <p className="text-lg font-semibold">${pack.price.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">
                  {pack.perCredit}/credit
                </p>
                <Button
                  size="sm"
                  className="mt-1 w-full"
                  variant={pack.badge ? 'default' : 'outline'}
                  onClick={() => handleBuy(pack.id)}
                  disabled={loading !== null}
                >
                  {loading === pack.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Buy'
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
