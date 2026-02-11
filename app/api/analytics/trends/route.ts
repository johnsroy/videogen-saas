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
    const granularity = url.searchParams.get('granularity') || 'day'

    const admin = getSupabaseAdmin()

    const [
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
    ] = await Promise.all([
      admin.rpc('get_video_creation_trend', { p_user_id: user.id, p_from: from, p_to: to, p_granularity: granularity }),
      admin.rpc('get_views_over_time', { p_user_id: user.id, p_from: from, p_to: to, p_granularity: granularity }),
      admin.rpc('get_language_distribution', { p_user_id: user.id, p_from: from, p_to: to }),
      admin.rpc('get_mode_breakdown', { p_user_id: user.id, p_from: from, p_to: to }),
      admin.rpc('get_dimension_breakdown', { p_user_id: user.id, p_from: from, p_to: to }),
      admin.rpc('get_top_performing_videos', { p_user_id: user.id, p_from: from, p_to: to, p_limit: 10 }),
      admin.rpc('get_ai_usage_over_time', { p_user_id: user.id, p_from: from, p_to: to, p_granularity: granularity }),
      // Recent activity data
      admin.from('videos').select('id, title, created_at')
        .eq('user_id', user.id).neq('status', 'failed')
        .order('created_at', { ascending: false }).limit(5),
      admin.from('video_views').select('id, video_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(5),
      admin.from('script_enhancements').select('id, action, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(5),
    ])

    // Format creation trend
    const formattedCreation = (creationTrend || []).map((r: { period: string; count: number }) => ({
      date: r.period, count: Number(r.count),
    }))

    // Format views trend
    const formattedViews = (viewsTrend || []).map((r: { period: string; count: number }) => ({
      date: r.period, count: Number(r.count),
    }))

    // Format distributions
    const formattedLanguages = (languageDist || []).map((r: { language: string; count: number }) => ({
      name: r.language || 'en', value: Number(r.count),
    }))

    const formattedModes = (modeDist || []).map((r: { mode: string; count: number }) => ({
      name: r.mode === 'avatar' ? 'Avatar' : 'Prompt', value: Number(r.count),
    }))

    const formattedDimensions = (dimensionDist || []).map((r: { dimension: string; count: number }) => {
      const labels: Record<string, string> = {
        '1920x1080': 'Landscape (16:9)',
        '1280x720': 'Landscape (16:9)',
        '1080x1920': 'Portrait (9:16)',
        '720x1280': 'Portrait (9:16)',
        '1080x1080': 'Square (1:1)',
        '720x720': 'Square (1:1)',
      }
      return { name: labels[r.dimension] || r.dimension, value: Number(r.count) }
    })

    // Merge same dimension labels
    const dimMap = new Map<string, number>()
    for (const d of formattedDimensions) {
      dimMap.set(d.name, (dimMap.get(d.name) || 0) + d.value)
    }
    const mergedDimensions = Array.from(dimMap.entries()).map(([name, value]) => ({ name, value }))

    // Format top videos
    const formattedTop = (topVideos || []).map((r: {
      video_id: string; title: string; total_views: number;
      avg_watch_time: number; avg_completion_rate: number; share_id: string | null
    }) => ({
      id: r.video_id,
      title: r.title,
      views: Number(r.total_views),
      avgWatchTime: Math.round(r.avg_watch_time * 10) / 10,
      completionRate: Math.round(r.avg_completion_rate * 100),
      shareId: r.share_id,
    }))

    // Format AI usage over time (pivot by action)
    const aiMap = new Map<string, { generate: number; enhance: number; translate: number }>()
    for (const r of (aiUsage || []) as { period: string; action: string; count: number }[]) {
      const existing = aiMap.get(r.period) || { generate: 0, enhance: 0, translate: 0 }
      const action = r.action as string
      if (action === 'generate' || action === 'generate_multilingual') {
        existing.generate += Number(r.count)
      } else if (action === 'translate' || action === 'translate_captions') {
        existing.translate += Number(r.count)
      } else {
        existing.enhance += Number(r.count)
      }
      aiMap.set(r.period, existing)
    }
    const formattedAiUsage = Array.from(aiMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Build activity feed
    type ActivityItem = { id: string; type: string; title: string; description: string; timestamp: string }
    const activity: ActivityItem[] = []

    for (const v of recentVideos || []) {
      activity.push({
        id: v.id,
        type: 'video_created',
        title: 'Video Created',
        description: v.title,
        timestamp: v.created_at,
      })
    }
    for (const v of recentViews || []) {
      activity.push({
        id: v.id,
        type: 'video_viewed',
        title: 'Video Viewed',
        description: `New view recorded`,
        timestamp: v.created_at,
      })
    }
    for (const a of recentAi || []) {
      const actionLabels: Record<string, string> = {
        generate: 'Script Generated',
        enhance: 'Script Enhanced',
        translate: 'Script Translated',
        translate_captions: 'Captions Translated',
        generate_multilingual: 'Multilingual Script Generated',
      }
      activity.push({
        id: a.id,
        type: 'ai_used',
        title: actionLabels[a.action] || 'AI Feature Used',
        description: a.action,
        timestamp: a.created_at,
      })
    }

    // Sort by timestamp descending, take 15
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      creationTrend: formattedCreation,
      viewsTrend: formattedViews,
      languageDistribution: formattedLanguages,
      modeBreakdown: formattedModes,
      dimensionBreakdown: mergedDimensions,
      topVideos: formattedTop,
      aiUsageOverTime: formattedAiUsage,
      recentActivity: activity.slice(0, 15),
    })
  } catch (error) {
    console.error('Analytics trends error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
