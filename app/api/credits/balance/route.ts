import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserCreditBalance } from '@/lib/credits'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const balance = await getUserCreditBalance(user.id)
    return NextResponse.json(balance)
  } catch (error) {
    console.error('Credit balance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
