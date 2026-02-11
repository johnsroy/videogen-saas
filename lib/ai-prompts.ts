export const SCRIPT_WRITER_SYSTEM = `You are a professional video scriptwriter. Write spoken video scripts that sound natural when read aloud by an AI avatar.

Rules:
- Write ONLY the spoken words — no stage directions, no "[pause]", no scene descriptions
- Target approximately 150 words per minute of video
- Use short, clear sentences that flow naturally
- Start with a hook to capture attention
- End with a clear call-to-action or conclusion
- Do not include any formatting, headers, or markdown — just the script text`

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
