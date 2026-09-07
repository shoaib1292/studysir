import type { Metadata } from 'next'
import PublicPostView from './PublicPostView'

interface PageProps {
  params: Promise<{ id: string }>
}

// Generate dynamic metadata for social media sharing
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/post/${id}`, { cache: 'no-store' })

    if (!res.ok) {
      return {
        title: 'StudySir — Post not found',
        description: 'This post may have been removed or is no longer available.',
      }
    }

    const post = await res.json()

    return {
      title: `${post.title} — StudySir`,
      description: post.description?.slice(0, 160) || 'Check out this post on StudySir',
      openGraph: {
        title: post.title,
        description: post.description?.slice(0, 200) || 'Check out this post on StudySir',
        images: post.image ? [post.image] : ['/images/cover-classroom.png'],
        type: 'website',
        siteName: 'StudySir',
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.description?.slice(0, 200) || 'Check out this post on StudySir',
        images: post.image ? [post.image] : ['/images/cover-classroom.png'],
      },
    }
  } catch {
    return {
      title: 'StudySir',
      description: 'Connecting Students & Teachers',
    }
  }
}

export default function PostPage() {
  return <PublicPostView />
}
