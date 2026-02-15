import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateVeoVideo } from '@/lib/google-veo'
import { SHOT_TEMPLATES } from '@/lib/shot-templates'

export const maxDuration = 60

// Sample products per category for generating preview prompts
const CATEGORY_SAMPLES: Record<string, { product: string; description: string }> = {
  'product-showcase': { product: 'a premium wireless headphone', description: 'Sleek matte black design with metallic accents, over-ear cushions, and LED indicators' },
  'lifestyle': { product: 'a stylish ceramic coffee mug', description: 'Handcrafted white ceramic mug with a gold rim, held by someone in a cozy setting' },
  'fashion-beauty': { product: 'a luxury wristwatch', description: 'Rose gold case with a dark navy dial, leather strap, elegant timepiece' },
  'food-beverage': { product: 'an artisan chocolate bar', description: 'Rich dark chocolate with gold foil wrapper, cocoa beans scattered around' },
  'tech-gadgets': { product: 'a sleek smartphone', description: 'Ultra-thin phone with edge-to-edge OLED display, titanium frame, triple camera' },
  'travel-adventure': { product: 'a rugged backpack', description: 'Weatherproof hiking backpack in forest green, with buckles and compression straps' },
  'business-corporate': { product: 'a premium leather briefcase', description: 'Italian leather briefcase in cognac brown, brass hardware, professional elegance' },
  'social-media': { product: 'a trendy water bottle', description: 'Insulated stainless steel bottle in gradient sunset colors, minimalist design' },
  'ugc-authentic': { product: 'a natural skincare serum', description: 'Glass dropper bottle with botanical label, surrounded by fresh herbs and flowers' },
  'seasonal': { product: 'a festive candle set', description: 'Three artisan candles in cranberry, pine, and vanilla, in decorative glass jars' },
}

/**
 * Admin endpoint to batch-generate template preview videos.
 * Secured by service role key.
 * POST body: { batchSize?: number, templateIds?: string[] }
 */
export async function POST(request: Request) {
  // Authenticate — admin only
  const secret = request.headers.get('x-worker-secret')
  if (!secret || secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const batchSize = Math.min(body.batchSize ?? 5, 10)
  const requestedIds: string[] | undefined = body.templateIds

  const admin = getSupabaseAdmin()

  // Get already-completed previews
  const { data: existingJobs } = await admin
    .from('template_preview_jobs')
    .select('template_id, status')

  const completedIds = new Set(
    (existingJobs ?? [])
      .filter((j) => j.status === 'completed' || j.status === 'generating')
      .map((j) => j.template_id)
  )

  // Find templates that need previews
  let templatesToProcess = SHOT_TEMPLATES.filter((t) => !completedIds.has(t.id))
  if (requestedIds) {
    templatesToProcess = templatesToProcess.filter((t) => requestedIds.includes(t.id))
  }
  const batch = templatesToProcess.slice(0, batchSize)

  if (batch.length === 0) {
    return NextResponse.json({
      message: 'All templates have previews or are generating',
      total: SHOT_TEMPLATES.length,
      completed: completedIds.size,
    })
  }

  const results: Array<{ templateId: string; status: string; operationName?: string }> = []

  for (const template of batch) {
    try {
      const sample = CATEGORY_SAMPLES[template.category] ?? CATEGORY_SAMPLES['product-showcase']
      const prompt = template.promptTemplate
        .replace(/\{product\}/g, sample.product)
        .replace(/\{product_description\}/g, sample.description)

      const result = await generateVeoVideo({
        prompt,
        aspectRatio: template.suggestedAspectRatio,
        duration: 4,
        generateAudio: false,
        model: 'veo-3.1-fast-generate-preview',
      })

      // Upsert preview job
      await admin
        .from('template_preview_jobs')
        .upsert({
          template_id: template.id,
          status: 'generating',
          veo_operation_name: result.operationName,
          prompt_used: prompt.slice(0, 500),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'template_id' })

      results.push({ templateId: template.id, status: 'generating', operationName: result.operationName })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      await admin
        .from('template_preview_jobs')
        .upsert({
          template_id: template.id,
          status: 'failed',
          error_message: msg,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'template_id' })

      results.push({ templateId: template.id, status: 'failed' })
    }
  }

  return NextResponse.json({
    processed: results.length,
    remaining: templatesToProcess.length - batch.length,
    total: SHOT_TEMPLATES.length,
    completed: completedIds.size,
    results,
  })
}
