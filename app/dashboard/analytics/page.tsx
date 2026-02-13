import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { AnalyticsContent } from './content'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()

  // Prefetch all analytics data in parallel
  const [
    { data: subscription },
    { count: totalVideos },
    { count: priorVideos },
    { count: totalViews },
    { count: priorViews },
    { data: completionData },
    { count: aiFeatures },
    { count: priorAiFeatures },
    { data: creationTrend },
    { data: viewsTrend },
    { data: languageDist },
    { data: modeDist },
    { data: dimensionDist },
    { data: topVideos },
    { data: aiUsage },
    { data: recentVideos },
    { data: recentViews },
    { data: recentAi },
    { data: videoSparkline },
    { data: viewsSparkline },
    { data: aiSparkline },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
    // KPI current
    admin.from('videos').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).neq('status', 'failed')
      .gte('created_at', thirtyDaysAgo),
    // KPI prior
    admin.from('videos').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).neq('status', 'failed')
      .gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    admin.from('video_views').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', thirtyDaysAgo),
    admin.from('video_views').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    admin.from('video_views').select('completion_rate')
      .eq('user_id', user.id).gte('created_at', thirtyDaysAgo),
    admin.from('script_enhancements').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', thirtyDaysAgo),
    admin.from('script_enhancements').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    // Trends
    admin.rpc('get_video_creation_trend', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now, p_granularity: 'day' }),
    admin.rpc('get_views_over_time', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now, p_granularity: 'day' }),
    admin.rpc('get_language_distribution', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now }),
    admin.rpc('get_mode_breakdown', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now }),
    admin.rpc('get_dimension_breakdown', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now }),
    admin.rpc('get_top_performing_videos', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now, p_limit: 10 }),
    admin.rpc('get_ai_usage_over_time', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now, p_granularity: 'day' }),
    // Recent activity
    admin.from('videos').select('id, title, created_at')
      .eq('user_id', user.id).neq('status', 'failed')
      .order('created_at', { ascending: false }).limit(5),
    admin.from('video_views').select('id, video_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(5),
    admin.from('script_enhancements').select('id, action, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(5),
    // Sparklines
    admin.rpc('get_video_creation_trend', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now, p_granularity: 'day' }),
    admin.rpc('get_views_over_time', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now, p_granularity: 'day' }),
    admin.rpc('get_ai_usage_over_time', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now, p_granularity: 'day' }),
  ])

  function calcTrend(current: number, prior: number): number {
    if (prior === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prior) / prior) * 100)
  }

  const avgCompletion = completionData && completionData.length > 0
    ? Math.round((completionData.reduce((s: number, d: { completion_rate: number }) => s + (d.completion_rate || 0), 0) / completionData.length) * 1000) / 10
    : 0

  const plan = subscription?.plan ?? 'free'
  const status = subscription?.status ?? 'active'
  const isProPlan = plan !== 'free' && status === 'active'

  // Format sparklines
  const videoSpark = (videoSparkline || []).map((r: { period: string; count: number }) => ({ date: r.period, value: Number(r.count) }))
  const viewsSpark = (viewsSparkline || []).map((r: { period: string; count: number }) => ({ date: r.period, value: Number(r.count) }))
  const aiMap = new Map<string, number>()
  for (const r of (aiSparkline || []) as { period: string; count: number }[]) {
    aiMap.set(r.period, (aiMap.get(r.period) || 0) + Number(r.count))
  }
  const aiSpark = Array.from(aiMap.entries()).map(([date, value]) => ({ date, value }))

  // Format trends
  const fmtCreation = (creationTrend || []).map((r: { period: string; count: number }) => ({ date: r.period, count: Number(r.count) }))
  const fmtViews = (viewsTrend || []).map((r: { period: string; count: number }) => ({ date: r.period, count: Number(r.count) }))
  const fmtLanguages = (languageDist || []).map((r: { language: string; count: number }) => ({ name: r.language || 'en', value: Number(r.count) }))
  const fmtModes = (modeDist || []).map((r: { mode: string; count: number }) => ({ name: r.mode === 'avatar' ? 'Avatar' : 'Prompt', value: Number(r.count) }))

  // Format dimensions with label merging
  const dimRaw = (dimensionDist || []).map((r: { dimension: string; count: number }) => {
    const labels: Record<string, string> = {
      '1920x1080': 'Landscape (16:9)', '1280x720': 'Landscape (16:9)',
      '1080x1920': 'Portrait (9:16)', '720x1280': 'Portrait (9:16)',
      '1080x1080': 'Square (1:1)', '720x720': 'Square (1:1)',
    }
    return { name: labels[r.dimension] || r.dimension, value: Number(r.count) }
  })
  const dimMap2 = new Map<string, number>()
  for (const d of dimRaw) dimMap2.set(d.name, (dimMap2.get(d.name) || 0) + d.value)
  const fmtDimensions = Array.from(dimMap2.entries()).map(([name, value]) => ({ name, value }))

  // Format top videos
  const fmtTop = (topVideos || []).map((r: { video_id: string; title: string; total_views: number; avg_watch_time: number; avg_completion_rate: number; share_id: string | null }) => ({
    id: r.video_id, title: r.title, views: Number(r.total_views),
    avgWatchTime: Math.round(r.avg_watch_time * 10) / 10,
    completionRate: Math.round(r.avg_completion_rate * 100),
    shareId: r.share_id,
  }))

  // Format AI usage
  const aiUsageMap = new Map<string, { generate: number; enhance: number; translate: number }>()
  for (const r of (aiUsage || []) as { period: string; action: string; count: number }[]) {
    const ex = aiUsageMap.get(r.period) || { generate: 0, enhance: 0, translate: 0 }
    if (r.action === 'generate' || r.action === 'generate_multilingual') ex.generate += Number(r.count)
    else if (r.action === 'translate' || r.action === 'translate_captions') ex.translate += Number(r.count)
    else ex.enhance += Number(r.count)
    aiUsageMap.set(r.period, ex)
  }
  const fmtAiUsage = Array.from(aiUsageMap.entries()).map(([date, c]) => ({ date, ...c })).sort((a, b) => a.date.localeCompare(b.date))

  // Build activity feed
  type ActivityItem = { id: string; type: 'video_created' | 'video_viewed' | 'ai_used' | 'share_created'; title: string; description: string; timestamp: string }
  const activity: ActivityItem[] = []
  for (const v of recentVideos || []) {
    activity.push({ id: v.id, type: 'video_created', title: 'Video Created', description: v.title, timestamp: v.created_at })
  }
  for (const v of recentViews || []) {
    activity.push({ id: v.id, type: 'video_viewed', title: 'Video Viewed', description: 'New view recorded', timestamp: v.created_at })
  }
  for (const a of recentAi || []) {
    const labels: Record<string, string> = { generate: 'Script Generated', enhance: 'Script Enhanced', translate: 'Script Translated', translate_captions: 'Captions Translated', generate_multilingual: 'Multilingual Script' }
    activity.push({ id: a.id, type: 'ai_used', title: labels[a.action] || 'AI Feature Used', description: a.action, timestamp: a.created_at })
  }
  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {user.email}
        </p>
      </div>

      <DashboardNav />

      <AnalyticsContent
        isProPlan={isProPlan}
        initialKpis={{
          totalVideos: totalVideos ?? 0,
          totalVideosTrend: calcTrend(totalVideos ?? 0, priorVideos ?? 0),
          totalViews: totalViews ?? 0,
          totalViewsTrend: calcTrend(totalViews ?? 0, priorViews ?? 0),
          avgCompletionRate: avgCompletion,
          avgCompletionRateTrend: 0,
          aiFeatureUsed: aiFeatures ?? 0,
          aiFeatureUsedTrend: calcTrend(aiFeatures ?? 0, priorAiFeatures ?? 0),
          sparklines: { videos: videoSpark, views: viewsSpark, completion: viewsSpark, aiUsage: aiSpark },
        }}
        initialTrends={{
          creationTrend: fmtCreation,
          viewsTrend: fmtViews,
          languageDistribution: fmtLanguages,
          modeBreakdown: fmtModes,
          dimensionBreakdown: fmtDimensions,
          topVideos: fmtTop,
          aiUsageOverTime: fmtAiUsage,
          recentActivity: activity.slice(0, 15),
        }}
      />
    </div>
  )
}
