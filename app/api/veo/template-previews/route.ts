import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Returns all available template preview URLs.
 * Public endpoint (no auth needed) — preview URLs are in a public bucket.
 */
export async function GET() {
  try {
    const { data: previews } = await getSupabaseAdmin()
      .from('template_preview_jobs')
      .select('template_id, preview_url')
      .eq('status', 'completed')
      .not('preview_url', 'is', null)

    // Return as a map: { templateId: previewUrl }
    const previewMap: Record<string, string> = {}
    for (const p of previews ?? []) {
      if (p.preview_url) {
        previewMap[p.template_id] = p.preview_url
      }
    }

    return NextResponse.json({ previews: previewMap })
  } catch (error) {
    console.error('Template previews error:', error)
    return NextResponse.json({ previews: {} })
  }
}
