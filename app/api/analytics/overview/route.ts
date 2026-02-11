import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const to = url.searchParams.get('to') || new Date().toISOString()
    const from = url.searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString()

    // Calculate prior period for trends
    const rangMs = new Date(to).getTime() - new Date(from).getTime()
    const priorFrom = new Date(new Date(from).getTime() - rangMs).toISOString()
    const priorTo = from

    const admin = getSupabaseAdmin()

    const [
      { count: totalVideos },
      { count: priorVideos },
      { count: totalViews },
      { count: priorViews },
      { data: completionData },
      { data: priorCompletionData },
      { count: aiFeatures },
      { count: priorAiFeatures },
      { data: videoSparkline },
      { data: viewsSparkline },
      { data: aiSparkline },
    ] = await Promise.all([
      // Current period counts
      admin.from('videos').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).neq('status', 'failed')
        .gte('created_at', from).lte('created_at', to),
      // Prior period counts
      admin.from('videos').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).neq('status', 'failed')
        .gte('created_at', priorFrom).lte('created_at', priorTo),
      // Views current
      admin.from('video_views').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', from).lte('created_at', to),
      // Views prior
      admin.from('video_views').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', priorFrom).lte('created_at', priorTo),
      // Completion rate current
      admin.from('video_views').select('completion_rate')
        .eq('user_id', user.id)
        .gte('created_at', from).lte('created_at', to),
      // Completion rate prior
      admin.from('video_views').select('completion_rate')
        .eq('user_id', user.id)
        .gte('created_at', priorFrom).lte('created_at', priorTo),
      // AI features current
      admin.from('script_enhancements').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', from).lte('created_at', to),
      // AI features prior
      admin.from('script_enhancements').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', priorFrom).lte('created_at', priorTo),
      // Sparklines
      admin.rpc('get_video_creation_trend', { p_user_id: user.id, p_from: from, p_to: to, p_granularity: 'day' }),
      admin.rpc('get_views_over_time', { p_user_id: user.id, p_from: from, p_to: to, p_granularity: 'day' }),
      admin.rpc('get_ai_usage_over_time', { p_user_id: user.id, p_from: from, p_to: to, p_granularity: 'day' }),
    ])

    function calcTrend(current: number, prior: number): number {
      if (prior === 0) return current > 0 ? 100 : 0
      return Math.round(((current - prior) / prior) * 100)
    }

    function calcAvg(data: { completion_rate: number }[] | null): number {
      if (!data || data.length === 0) return 0
      const sum = data.reduce((acc, d) => acc + (d.completion_rate || 0), 0)
      return Math.round((sum / data.length) * 1000) / 10
    }

    const avgCompletion = calcAvg(completionData)
    const priorAvgCompletion = calcAvg(priorCompletionData)

    // Build sparkline data
    const videoSpark = (videoSparkline || []).map((r: { period: string; count: number }) => ({
      date: r.period, value: Number(r.count),
    }))
    const viewsSpark = (viewsSparkline || []).map((r: { period: string; count: number }) => ({
      date: r.period, value: Number(r.count),
    }))
    // Aggregate AI usage sparkline by date
    const aiMap = new Map<string, number>()
    for (const r of (aiSparkline || []) as { period: string; count: number }[]) {
      const existing = aiMap.get(r.period) || 0
      aiMap.set(r.period, existing + Number(r.count))
    }
    const aiSpark = Array.from(aiMap.entries()).map(([date, value]) => ({ date, value }))

    return NextResponse.json({
      totalVideos: totalVideos ?? 0,
      totalVideosTrend: calcTrend(totalVideos ?? 0, priorVideos ?? 0),
      totalViews: totalViews ?? 0,
      totalViewsTrend: calcTrend(totalViews ?? 0, priorViews ?? 0),
      avgCompletionRate: avgCompletion,
      avgCompletionRateTrend: calcTrend(avgCompletion, priorAvgCompletion),
      aiFeatureUsed: aiFeatures ?? 0,
      aiFeatureUsedTrend: calcTrend(aiFeatures ?? 0, priorAiFeatures ?? 0),
      sparklines: {
        videos: videoSpark,
        views: viewsSpark,
        completion: viewsSpark, // Reuse views sparkline for completion
        aiUsage: aiSpark,
      },
    })
  } catch (error) {
    console.error('Analytics overview error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
