'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UsageCard } from '@/components/dashboard/usage-card'
import { Loader2, ArrowDown, ArrowUp, Zap } from 'lucide-react'

interface CreditTransaction {
  id: string
  amount: number
  balance_after: number
  type: string
  resource_type: string | null
  description: string | null
  created_at: string
}

export function UsageContent() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch('/api/credits/transactions')
        if (res.ok) {
          const data = await res.json()
          setTransactions(data.transactions ?? [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <UsageCard />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Used</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {transactions.filter((t) => t.type === 'consumption').reduce((sum, t) => sum + Math.abs(t.amount), 0)}
            </span>
            <span className="text-sm text-muted-foreground"> credits</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{transactions.length}</span>
            <span className="text-sm text-muted-foreground"> total</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Credit History
          </CardTitle>
          <CardDescription>Your AI Video credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet. Generate an AI video or image to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {tx.amount > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.description ?? tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {tx.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
