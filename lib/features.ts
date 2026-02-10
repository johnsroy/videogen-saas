import { Video, Sparkles, Zap, Globe, Shield, BarChart3, type LucideIcon } from 'lucide-react'

export interface Feature {
  slug: string
  icon: LucideIcon
  title: string
  description: string
  longDescription: string
  showcaseItems: string[]
}

export const features: Feature[] = [
  {
    slug: 'ai-video-creation',
    icon: Video,
    title: 'AI Video Creation',
    description: 'Generate professional videos from text prompts. Just describe what you want and let AI do the rest.',
    longDescription:
      'Our AI video creation engine transforms your text descriptions into fully produced videos. Simply write a prompt describing your vision — the scene, mood, style, and content — and our AI handles everything from storyboarding to final rendering.',
    showcaseItems: [
      'Text-to-video generation with natural language prompts',
      'Multiple visual styles: cinematic, animated, documentary, and more',
      'Automatic scene composition and camera movements',
      'Custom aspect ratios for any platform (16:9, 9:16, 1:1)',
    ],
  },
  {
    slug: 'smart-editing',
    icon: Sparkles,
    title: 'Smart Editing',
    description: 'Automatically enhance your videos with AI-powered color correction, transitions, and effects.',
    longDescription:
      'Smart Editing uses AI to automatically improve your videos with professional-grade enhancements. From color grading to seamless transitions, every edit is applied intelligently based on your content.',
    showcaseItems: [
      'AI-powered color correction and grading',
      'Automatic transition detection and insertion',
      'Background music matching and audio balancing',
      'One-click style transfer from reference videos',
    ],
  },
  {
    slug: 'lightning-fast',
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Render videos in minutes, not hours. Our infrastructure is optimized for speed and quality.',
    longDescription:
      'Built on distributed GPU infrastructure, VideoGen renders your videos at unprecedented speeds. What traditionally takes hours of rendering now completes in minutes, without compromising on quality.',
    showcaseItems: [
      'Distributed GPU rendering across global data centers',
      'Average render time under 3 minutes for standard videos',
      'Real-time preview while your video is being generated',
      'Queue priority for Pro users with instant processing',
    ],
  },
  {
    slug: 'multi-language',
    icon: Globe,
    title: 'Multi-Language',
    description: 'Create videos in 50+ languages with natural-sounding AI voiceovers and subtitles.',
    longDescription:
      'Reach a global audience with built-in multi-language support. Generate voiceovers in over 50 languages with natural-sounding AI voices, and automatically produce accurate subtitles.',
    showcaseItems: [
      'AI voiceovers in 50+ languages with native pronunciation',
      'Automatic subtitle generation and translation',
      'Lip-sync technology for dubbed content',
      'Right-to-left language support for Arabic, Hebrew, and more',
    ],
  },
  {
    slug: 'enterprise-security',
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption. Your content is safe and private.',
    longDescription:
      'VideoGen is built with enterprise-grade security from the ground up. SOC 2 Type II certified, with end-to-end encryption for all content and strict access controls to keep your data private.',
    showcaseItems: [
      'SOC 2 Type II certified infrastructure',
      'End-to-end encryption for all uploads and renders',
      'Role-based access control for team workspaces',
      'Data residency options for EU and US regions',
    ],
  },
  {
    slug: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track video performance with built-in analytics. Understand your audience and optimize.',
    longDescription:
      'Get deep insights into how your videos perform. Track views, engagement, watch time, and audience demographics to optimize your content strategy and maximize impact.',
    showcaseItems: [
      'Real-time view counts and engagement metrics',
      'Audience retention graphs and drop-off analysis',
      'Geographic and demographic audience breakdowns',
      'A/B testing for thumbnails and video variations',
    ],
  },
]

export function getFeatureBySlug(slug: string): Feature | undefined {
  return features.find((f) => f.slug === slug)
}

export function getAllFeatureSlugs(): string[] {
  return features.map((f) => f.slug)
}
