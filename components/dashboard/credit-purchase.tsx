'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, Loader2, Sparkles } from 'lucide-react'

const CREDIT_PACKS = [
  { id: 'pack_5', credits: 5, price: 10, perCredit: '$2.00', badge: 'Starter' },
  { id: 'pack_25', credits: 25, price: 25, perCredit: '$1.00' },
  { id: 'pack_50', credits: 50, price: 50, perCredit: '$1.00' },
  { id: 'pack_100', credits: 100, price: 100, perCredit: '$1.00' },
  { id: 'pack_500', credits: 500, price: 500, perCredit: '$1.00', badge: 'Most Popular' },
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
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CREDIT_PACKS.map((pack) => (
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
        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
