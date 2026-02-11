export interface ParsedUA {
  device_type: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
}

export function parseUserAgent(ua: string): ParsedUA {
  const lower = ua.toLowerCase()

  // Device type
  let device_type: ParsedUA['device_type'] = 'desktop'
  if (/ipad|tablet|playbook|silk/i.test(ua)) {
    device_type = 'tablet'
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    device_type = 'mobile'
  }

  // Browser
  let browser = 'Other'
  if (lower.includes('edg/')) browser = 'Edge'
  else if (lower.includes('opr/') || lower.includes('opera')) browser = 'Opera'
  else if (lower.includes('chrome') && !lower.includes('edg')) browser = 'Chrome'
  else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari'
  else if (lower.includes('firefox')) browser = 'Firefox'

  // OS
  let os = 'Other'
  if (lower.includes('windows')) os = 'Windows'
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS'
  else if (lower.includes('linux') && !lower.includes('android')) os = 'Linux'
  else if (lower.includes('android')) os = 'Android'
  else if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ipod')) os = 'iOS'

  return { device_type, browser, os }
}

export function parseDomain(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}
