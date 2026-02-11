import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/anthropic'
import { ANALYTICS_INSIGHTS_SYSTEM, buildAnalyticsInsightsPrompt } from '@/lib/ai-prompts'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    // Check cache first
    const { data: cached } = await admin
      .from('analytics_insights_cache')
      .select('insights, expires_at')
      .eq('user_id', user.id)
      .single()

    if (cached && new Date(cached.expires_at) > now) {
      return NextResponse.json({
        insights: cached.insights,
        generatedAt: cached.expires_at,
        cached: true,
      })
    }

    // Gather data for insights
    const [
      { count: totalVideos },
      { count: totalViews },
      { data: completionData },
      { data: languageData },
      { data: modeData },
      { data: dimensionData },
      { data: durationData },
      { count: aiUsage },
      { data: topVideos },
    ] = await Promise.all([
      admin.from('videos').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).neq('status', 'failed'),
      admin.from('video_views').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      admin.from('video_views').select('completion_rate')
        .eq('user_id', user.id),
      admin.rpc('get_language_distribution', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now.toISOString() }),
      admin.rpc('get_mode_breakdown', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now.toISOString() }),
      admin.rpc('get_dimension_breakdown', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now.toISOString() }),
      admin.from('videos').select('duration')
        .eq('user_id', user.id).neq('status', 'failed').not('duration', 'is', null),
      admin.from('script_enhancements').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      admin.rpc('get_top_performing_videos', { p_user_id: user.id, p_from: thirtyDaysAgo, p_to: now.toISOString(), p_limit: 1 }),
    ])

    const avgCompletion = completionData && completionData.length > 0
      ? Math.round((completionData.reduce((s, d) => s + (d.completion_rate || 0), 0) / completionData.length) * 100)
      : 0

    const avgDuration = durationData && durationData.length > 0
      ? Math.round(durationData.reduce((s, d) => s + (d.duration || 0), 0) / durationData.length)
      : 0

    const topVideo = topVideos?.[0] || null

    const prompt = buildAnalyticsInsightsPrompt({
      totalVideos: totalVideos ?? 0,
      totalViews: totalViews ?? 0,
      avgCompletionRate: avgCompletion,
      languageBreakdown: (languageData || []).map((r: { language: string; count: number }) => ({
        language: r.language, count: Number(r.count),
      })),
      modeBreakdown: (modeData || []).map((r: { mode: string; count: number }) => ({
        mode: r.mode, count: Number(r.count),
      })),
      dimensionBreakdown: (dimensionData || []).map((r: { dimension: string; count: number }) => ({
        dimension: r.dimension, count: Number(r.count),
      })),
      avgDuration,
      aiFeatureUsage: aiUsage ?? 0,
      topVideoTitle: topVideo?.title || null,
      topVideoViews: topVideo ? Number(topVideo.total_views) : 0,
    })

    const result = await chatCompletion({
      system: ANALYTICS_INSIGHTS_SYSTEM,
      user: prompt,
      maxTokens: 1000,
      temperature: 0.7,
    })

    let insights
    try {
      insights = JSON.parse(result.content)
    } catch {
      insights = [
        { icon: 'sparkles', title: 'Getting Started', description: 'Create more videos and share them to unlock detailed insights about your content performance.', category: 'growth' },
        { icon: 'target', title: 'Share Your Videos', description: 'Use the Share button on your videos to generate trackable links and start collecting view data.', category: 'engagement' },
        { icon: 'trending-up', title: 'Track Performance', description: 'As you create more content, this section will provide data-driven recommendations to improve your videos.', category: 'performance' },
        { icon: 'globe', title: 'Go Multilingual', description: 'Try creating videos in different languages using the Translate tab to reach a global audience.', category: 'content' },
      ]
    }

    // Cache the result
    const dataHash = `${totalVideos}-${totalViews}-${aiUsage}`
    await admin
      .from('analytics_insights_cache')
      .upsert({
        user_id: user.id,
        insights,
        data_hash: dataHash,
        generated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 24 * 3600000).toISOString(),
      }, { onConflict: 'user_id' })

    return NextResponse.json({
      insights,
      generatedAt: now.toISOString(),
      cached: false,
    })
  } catch (error) {
    console.error('Analytics insights error:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
