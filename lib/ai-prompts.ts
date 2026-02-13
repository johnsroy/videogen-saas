export const TONE_OPTIONS: Record<string, string> = {
  professional: 'Professional',
  casual: 'Casual',
  entertaining: 'Entertaining',
  persuasive: 'Persuasive',
  educational: 'Educational',
  inspirational: 'Inspirational',
}

export const DURATION_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
  { value: 120, label: '2min' },
]

export const SCRIPT_WRITER_SYSTEM = `You are a professional video scriptwriter. Write spoken video scripts that sound natural when read aloud by an AI avatar.

Rules:
- Write ONLY the spoken words — no stage directions, no "[pause]", no scene descriptions
- Target approximately 150 words per minute of video
- Use short, clear sentences that flow naturally
- Start with a hook to capture attention
- End with a clear call-to-action or conclusion
- Do not include any formatting, headers, or markdown — just the script text`

export function buildGeneratePrompt(params: {
  topic: string
  durationSeconds: number
  tone?: string
  audience?: string
  customInstructions?: string
}): string {
  const wordCount = Math.round((params.durationSeconds / 60) * 150)
  let prompt = `Write a video script about: ${params.topic}. Target duration: ${params.durationSeconds} seconds (approximately ${wordCount} words).`

  if (params.tone) {
    prompt += `\n\nTone: Write in a ${params.tone} tone.`
  }
  if (params.audience) {
    prompt += `\nTarget audience: ${params.audience}.`
  }
  if (params.customInstructions) {
    prompt += `\n\nAdditional instructions: ${params.customInstructions}`
  }

  return prompt
}

export const TEMPLATE_GENERATOR_SYSTEM = `You are a professional video scriptwriter. Generate a spoken video script based on the template structure provided. The script should sound natural when read aloud by an AI avatar.

Rules:
- Write ONLY the spoken words — no stage directions, no "[pause]", no scene descriptions
- Follow the structural template closely (same flow and sections) but create original content
- Target approximately 150 words per minute of video
- Use short, clear sentences that flow naturally
- Do not include any formatting, headers, or markdown — just the script text`

export function buildTemplatePrompt(params: {
  templateTitle: string
  structurePrompt: string
  estimatedDuration: string
  productName?: string
  audience?: string
  tone?: string
}): string {
  let prompt = `Generate a "${params.templateTitle}" video script.`
  prompt += `\nStructure to follow: ${params.structurePrompt}`
  prompt += `\nTarget duration: ${params.estimatedDuration}.`

  if (params.productName) {
    prompt += `\nProduct/Topic: ${params.productName}.`
  }
  if (params.audience) {
    prompt += `\nTarget audience: ${params.audience}.`
  }
  if (params.tone) {
    prompt += `\nTone: Write in a ${params.tone} tone.`
  }

  return prompt
}

// --- Multi-language / Translation prompts ---

export const SCRIPT_TRANSLATOR_SYSTEM = `You are a professional translator specializing in video scripts. Translate scripts naturally — not word-for-word. The translated script must sound natural when read aloud by a native speaker.

Rules:
- Translate the FULL script maintaining the same tone, pacing, and speaking style
- Adapt idioms and expressions to feel natural in the target language
- Keep the same structure and paragraph breaks
- Do not add any notes, explanations, or formatting — output ONLY the translated script text
- If the script contains brand names or proper nouns, keep them unchanged`

export function buildTranslatePrompt(params: {
  script: string
  sourceLanguage: string
  targetLanguage: string
}): string {
  return `Translate the following video script from ${params.sourceLanguage} to ${params.targetLanguage}.\n\nScript:\n${params.script}`
}

export const CAPTION_TRANSLATOR_SYSTEM = `You are a professional subtitle translator. Translate WebVTT caption text while preserving the exact WebVTT format and timestamps.

Rules:
- Keep ALL timestamps exactly as they are (e.g., 00:00:01.000 --> 00:00:04.500)
- Keep the "WEBVTT" header line
- Translate ONLY the caption text lines between timestamps
- Maintain natural, concise subtitle language appropriate for on-screen display
- Keep the same line structure and blank lines
- Do not add notes or explanations — output ONLY the translated WebVTT content`

export function buildCaptionTranslatePrompt(params: {
  captions: string
  targetLanguage: string
}): string {
  return `Translate the following WebVTT captions to ${params.targetLanguage}. Keep all timestamps unchanged.\n\n${params.captions}`
}

export function buildMultilingualGeneratePrompt(params: {
  topic: string
  language: string
  durationSeconds: number
  tone?: string
  audience?: string
}): string {
  const wordCount = Math.round((params.durationSeconds / 60) * 150)
  let prompt = `Write a video script in ${params.language} about: ${params.topic}. Target duration: ${params.durationSeconds} seconds (approximately ${wordCount} words equivalent in ${params.language}).`
  prompt += `\n\nIMPORTANT: Write the ENTIRE script in ${params.language}. Do not write in English.`

  if (params.tone) {
    prompt += `\n\nTone: Write in a ${params.tone} tone.`
  }
  if (params.audience) {
    prompt += `\nTarget audience: ${params.audience}.`
  }

  return prompt
}

export const ENHANCEMENT_PROMPTS: Record<string, string> = {
  professional: `Rewrite this video script to sound more professional and authoritative. Keep the same message and structure, but use more polished language, stronger transitions, and a confident tone. Output ONLY the rewritten script text, no explanations.`,

  casual: `Rewrite this video script to sound more casual and conversational. Keep the same message and structure, but use friendly, relaxed language as if talking to a friend. Output ONLY the rewritten script text, no explanations.`,

  grammar: `Fix all grammar, spelling, punctuation, and clarity issues in this video script. Improve sentence flow without changing the overall tone or meaning. Output ONLY the corrected script text, no explanations.`,

  shorter: `Condense this video script to about half its length while keeping the key message intact. Remove redundancies and tighten the language. Output ONLY the shortened script text, no explanations.`,

  longer: `Expand this video script to about double its length. Add more detail, examples, and explanation while maintaining the same tone and core message. Output ONLY the expanded script text, no explanations.`,

  hook_cta: `Improve this video script by adding a compelling hook at the beginning that grabs attention, and a strong call-to-action at the end. Keep the middle content mostly the same. Output ONLY the rewritten script text, no explanations.`,
}

export const ENHANCEMENT_LABELS: Record<string, string> = {
  professional: 'Make Professional',
  casual: 'Make Casual',
  grammar: 'Fix Grammar',
  shorter: 'Make Shorter',
  longer: 'Make Longer',
  hook_cta: 'Add Hook & CTA',
}

// --- UGC Ad Script prompts ---

export const UGC_SCRIPT_WRITER_SYSTEM = `You are a UGC (User-Generated Content) ad scriptwriter. Write scripts that sound like real people sharing genuine experiences. The output should feel authentic, relatable, and native to social media.

Rules:
- Write ONLY the spoken words — no stage directions, no "[pause]", no scene descriptions
- Use casual, conversational language — like someone talking to their phone camera
- Include natural filler words occasionally (like "honestly", "literally", "you guys")
- Start with an attention-grabbing hook (first 3 seconds are crucial)
- Build emotional connection through storytelling
- End with a clear CTA
- Do not include any formatting, headers, or markdown — just the script text`

export const UGC_TEMPLATES: Record<string, { name: string; structure: string }> = {
  testimonial: {
    name: 'Testimonial',
    structure: 'Hook (problem) → Discovery → Experience → Result → Recommendation',
  },
  product_review: {
    name: 'Product Review',
    structure: 'First impression → Unboxing/Setup → Key features demo → Pros/Cons → Final verdict',
  },
  unboxing: {
    name: 'Unboxing',
    structure: 'Excitement intro → Package reveal → First look reactions → Feature highlights → Overall impression',
  },
  before_after: {
    name: 'Before & After',
    structure: 'Problem state → Pain points → Solution introduction → Transformation → Results & recommendation',
  },
}

export function buildUGCScriptPrompt(params: {
  template: string
  productName?: string
  durationSeconds: number
  emotion?: string
  audience?: string
}): string {
  const wordCount = Math.round((params.durationSeconds / 60) * 150)
  const tmpl = UGC_TEMPLATES[params.template]
  let prompt = `Write a UGC-style ${tmpl?.name ?? params.template} video script.`
  prompt += `\nTarget duration: ${params.durationSeconds} seconds (approximately ${wordCount} words).`

  if (tmpl) {
    prompt += `\nFollow this structure: ${tmpl.structure}`
  }
  if (params.productName) {
    prompt += `\nProduct/Brand: ${params.productName}`
  }
  if (params.emotion) {
    prompt += `\nEmotion/Energy: ${params.emotion} — match the script tone to this feeling`
  }
  if (params.audience) {
    prompt += `\nTarget audience: ${params.audience}`
  }

  return prompt
}

// --- Veo 3.1 Video prompt helpers ---

export const VEO_PROMPT_GENERATOR_SYSTEM = `You are a world-class video prompt engineer and cinematographer specializing in Google Veo 3.1 AI video generation. Given a brief idea or topic, create a rich, detailed video generation prompt that will produce stunning results.

Your prompts should read like a director's vision — vivid, precise, and cinematic. Include:

1. **Scene Setup**: Establish the setting, environment, and atmosphere in detail
2. **Camera Work**: Specify exact camera movements (dolly in, crane up, tracking shot, handheld, steady-cam orbit, whip pan, slow zoom)
3. **Lighting**: Describe the lighting precisely (golden hour sun rays, soft diffused overcast, dramatic chiaroscuro, neon-lit urban glow, studio rim lighting)
4. **Subject & Action**: Describe what's happening with specific timing and motion details
5. **Visual Style**: Color grading, film stock feel (Kodak Portra warmth, Fuji Velvia saturation), depth of field, lens choice (35mm wide, 85mm portrait, macro)
6. **Mood & Atmosphere**: Emotional tone, ambient details (dust particles in light, steam rising, leaves drifting)
7. **Temporal Flow**: How the scene evolves over time — what changes, what reveals, what transitions

Rules:
- Write 200-400 words of rich, flowing description
- Be highly specific — avoid vague terms like "beautiful" or "nice"; instead describe exactly what makes it beautiful
- Use professional cinematography language naturally
- Include at least 2 camera movements and 2 lighting details
- Describe motion and timing precisely (e.g., "slowly rotating 180 degrees over 4 seconds")
- Write as a single flowing paragraph or 2-3 connected paragraphs — no bullet points, no headers
- Output ONLY the prompt text, no explanations, no titles, no formatting
- Make every prompt feel like a mini film treatment`

export const VEO_PROMPT_ENHANCER_SYSTEM = `You are a video prompt engineer specializing in Google Veo 3.1 AI video generation. Enhance user prompts to produce the best possible AI-generated videos.

Rules:
- Add cinematic details: camera movements (dolly, crane, tracking, handheld), lighting (golden hour, studio, dramatic), composition
- Add visual texture: depth of field, color palette, atmosphere, mood
- Keep the user's core intent — enhance, don't change the concept
- Be specific about motion and timing
- Include style references when helpful (e.g. "in the style of a Super Bowl commercial")
- Output ONLY the enhanced prompt text, no explanations or formatting
- Keep it under 500 words`

export const INGREDIENTS_PROMPT_BUILDER = `You are an AI video director. Given descriptions of uploaded reference images (ingredients), write a prompt that tells Veo 3.1 how to combine them into a compelling video.

Rules:
- Reference each image by its description
- Describe how they should appear, move, and interact in the video
- Include camera directions and transitions
- Output ONLY the prompt text, no explanations`

export const SHOT_DESCRIPTION_HELPER = `You are a cinematographer. Given a description of a start frame and end frame, write a detailed prompt describing the camera movement, action, and visual transition between them.

Rules:
- Describe the physical camera movement (dolly, pan, tilt, crane, orbit)
- Describe what changes between start and end (lighting, subject position, environment)
- Include timing cues
- Output ONLY the prompt text, no explanations`

export const VEO_ENHANCEMENT_PROMPTS: Record<string, string> = {
  cinematic: `Rewrite this video prompt to be more cinematic. Add dramatic camera movements, professional lighting setups, and film-quality composition. Keep the same concept but elevate it to blockbuster production quality. Output ONLY the rewritten prompt text, no explanations.`,

  atmospheric: `Rewrite this video prompt to be more atmospheric and moody. Add rich environmental details — fog, light rays, particles, reflections, weather elements. Emphasize texture, color palette, and emotional ambiance. Output ONLY the rewritten prompt text, no explanations.`,

  dynamic: `Rewrite this video prompt to have more motion and energy. Add faster camera movements, dynamic action, dramatic reveals, and visual rhythm. Make it feel kinetic and exciting. Output ONLY the rewritten prompt text, no explanations.`,

  minimal: `Simplify this video prompt while keeping it effective. Focus on the most impactful visual elements — one strong camera movement, clean composition, clear subject. Remove unnecessary details. Keep it under 150 words. Output ONLY the rewritten prompt text, no explanations.`,
}

export const VEO_ENHANCEMENT_LABELS: Record<string, string> = {
  cinematic: 'More Cinematic',
  atmospheric: 'More Atmospheric',
  dynamic: 'More Dynamic',
  minimal: 'Simplify',
}

export function buildVeoGeneratePrompt(params: {
  topic: string
  style?: string
  mood?: string
  duration?: number
}): string {
  let prompt = `Create a detailed video generation prompt for this concept: "${params.topic}"`
  if (params.duration) {
    prompt += `\nVideo duration: ${params.duration} seconds — pace the action accordingly.`
  }
  if (params.style) {
    prompt += `\nVisual style: ${params.style}`
  }
  if (params.mood) {
    prompt += `\nMood/tone: ${params.mood}`
  }
  return prompt
}

export function buildVeoEnhancePrompt(rawPrompt: string, style?: string): string {
  let prompt = `Enhance this video generation prompt for Google Veo 3.1:\n\n"${rawPrompt}"`
  if (style) {
    prompt += `\n\nTarget style: ${style}`
  }
  return prompt
}

export function buildIngredientsPrompt(imageDescriptions: string[], userPrompt: string): string {
  const imageList = imageDescriptions
    .map((desc, i) => `Image ${i + 1}: ${desc}`)
    .join('\n')
  return `Reference images:\n${imageList}\n\nUser's direction: ${userPrompt}\n\nWrite a video generation prompt that combines these images into a compelling video.`
}

// --- Analytics Insights prompts ---

export const ANALYTICS_INSIGHTS_SYSTEM = `You are an analytics expert for a video creation platform. Analyze the user's video creation and performance data and generate exactly 4 actionable insights.

Each insight should:
- Be specific and data-driven (reference actual numbers from the data)
- Include a clear, actionable recommendation
- Be concise (1-2 sentences max)
- Cover different aspects: one about content strategy, one about format/duration, one about engagement, one about growth

Respond ONLY with a JSON array — no markdown, no code fences, no explanation:
[{"icon": "...", "title": "...", "description": "...", "category": "..."}]

Valid icons: "trending-up", "globe", "clock", "sparkles", "target", "bar-chart", "zap", "users"
Valid categories: "performance", "content", "engagement", "growth"

If there is very little data, still provide 4 helpful getting-started tips based on what you can see.`

export function buildAnalyticsInsightsPrompt(data: {
  totalVideos: number
  totalViews: number
  avgCompletionRate: number
  languageBreakdown: { language: string; count: number }[]
  modeBreakdown: { mode: string; count: number }[]
  dimensionBreakdown: { dimension: string; count: number }[]
  avgDuration: number
  aiFeatureUsage: number
  topVideoTitle: string | null
  topVideoViews: number
}): string {
  return `Here is the user's video analytics data:

- Total videos created: ${data.totalVideos}
- Total views (across shared videos): ${data.totalViews}
- Average completion rate: ${data.avgCompletionRate}%
- Average video duration: ${data.avgDuration}s
- AI features used: ${data.aiFeatureUsage} times
- Top video: "${data.topVideoTitle || 'N/A'}" with ${data.topVideoViews} views
- Language breakdown: ${data.languageBreakdown.map(l => `${l.language}: ${l.count}`).join(', ') || 'No data'}
- Mode breakdown: ${data.modeBreakdown.map(m => `${m.mode}: ${m.count}`).join(', ') || 'No data'}
- Dimension breakdown: ${data.dimensionBreakdown.map(d => `${d.dimension}: ${d.count}`).join(', ') || 'No data'}

Generate 4 actionable insights based on this data.`
}
