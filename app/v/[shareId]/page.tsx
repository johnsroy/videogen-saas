import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { ShareVideoPlayer } from '@/components/share/share-video-player'
import { SharePageCTA } from '@/components/share/share-page-cta'
import type { Metadata } from 'next'

interface SharePageProps {
  params: Promise<{ shareId: string }>
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareId } = await params
  const admin = getSupabaseAdmin()

  const { data: share } = await admin
    .from('video_shares')
    .select('video_id')
    .eq('share_id', shareId)
    .eq('is_active', true)
    .single()

  if (!share) return { title: 'Video Not Found' }

  const { data: video } = await admin
    .from('videos')
    .select('title, thumbnail_url')
    .eq('id', share.video_id)
    .single()

  return {
    title: video?.title ? `${video.title} | VideoGen` : 'VideoGen',
    openGraph: {
      title: video?.title || 'VideoGen Video',
      type: 'video.other',
      ...(video?.thumbnail_url ? { images: [{ url: video.thumbnail_url }] } : {}),
    },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params
  const admin = getSupabaseAdmin()

  const { data: share } = await admin
    .from('video_shares')
    .select('share_id, video_id, is_active')
    .eq('share_id', shareId)
    .eq('is_active', true)
    .single()

  if (!share) {
    notFound()
  }

  const { data: video } = await admin
    .from('videos')
    .select('title, video_url, thumbnail_url, duration, script')
    .eq('id', share.video_id)
    .single()

  if (!video || !video.video_url) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl space-y-4">
        {/* Video Player */}
        <ShareVideoPlayer
          shareId={share.share_id}
          videoUrl={video.video_url}
          title={video.title}
          thumbnailUrl={video.thumbnail_url}
          duration={video.duration || 0}
        />

        {/* Video Info */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-white">{video.title}</h1>
        </div>

        {/* CTA */}
        <SharePageCTA />
      </div>
    </div>
  )
}
