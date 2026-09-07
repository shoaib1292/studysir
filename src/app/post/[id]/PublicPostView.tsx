'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { GraduationCap, BookOpen, ShoppingBag, UserCircle } from 'lucide-react'
import { SafeImage } from '@/components/study-sir/shared/SafeImage'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { api } from '@/lib/api'
import { FeedItem, UserDTO } from '@/lib/types'
import { FeedItemCard } from '@/components/study-sir/cards/FeedItemCard'

interface PostData {
  targetType: string
  targetId: string
  title: string
  description: string
  image: string | null
  authorName: string
  price: string | null
}

const TYPE_CONFIG: Record<string, { icon: typeof GraduationCap; label: string; color: string }> = {
  tuition: { icon: GraduationCap, label: 'Tuition Request', color: 'text-blue-600' },
  course: { icon: BookOpen, label: 'Course', color: 'text-violet-600' },
  good: { icon: ShoppingBag, label: 'Digital Product', color: 'text-amber-600' },
  teacher: { icon: UserCircle, label: 'Teacher', color: 'text-green-600' },
}

export default function PublicPostView() {
  const params = useParams()
  const [me, setMe] = useState<UserDTO | null>(null)
  const [post, setPost] = useState<PostData | null>(null)
  const [feedItem, setFeedItem] = useState<FeedItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const postId = params?.id as string

  // Check session on mount - this is the key fix!
  useEffect(() => {
    api.getSession()
      .then((d) => {
        if (d.user) setMe(d.user)
      })
      .catch(() => {
        // Not logged in - stay as guest
      })
  }, [])

  useEffect(() => {
    if (!postId) return

    fetch(`/api/post/${postId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then((data) => {
        setPost(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [postId])

  // If logged in, fetch the full feed item for interactive view
  useEffect(() => {
    if (!me || !post) return

    // Fetch the full post data for logged-in users
    const fetchFeedItem = async () => {
      try {
        const feed = await api.getFeed('all')
        const item = feed.items.find((i) => {
          if (post.targetType === 'tuition' && i.kind === 'tuition') return i.tuition.id === post.targetId
          if (post.targetType === 'course' && i.kind === 'course') return i.course.id === post.targetId
          if (post.targetType === 'good' && i.kind === 'good') return i.good.id === post.targetId
          if (post.targetType === 'teacher' && i.kind === 'teacher') return i.teacher.id === post.targetId
          return false
        })
        if (item) setFeedItem(item)
      } catch {
        // Silently fail - will fall back to public view
      }
    }

    fetchFeedItem()
  }, [me, post])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="animate-pulse text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <p className="mt-2 text-muted-foreground">This post may have been removed or is no longer available.</p>
          <Link href="/">
            <Button className="mt-4">Go to StudySir</Button>
          </Link>
        </div>
      </div>
    )
  }

  // If user is logged in and we have the feed item, show interactive view
  if (me && feedItem) {
    return (
      <div className="min-h-screen bg-background">
        {/* Simple header for logged-in users */}
        <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <Link href="/" className="font-logo text-[22px] tracking-tight text-[#1877F2]">
              StudySir
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-full">
                Back to Feed
              </Button>
            </Link>
          </div>
        </header>

        {/* Interactive post view */}
        <main className="mx-auto max-w-2xl px-4 py-8">
          <FeedItemCard item={feedItem} />
        </main>
      </div>
    )
  }

  // Public view for non-logged-in users
  const typeConfig = TYPE_CONFIG[post.targetType] || TYPE_CONFIG.tuition
  const TypeIcon = typeConfig.icon

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="font-logo text-[22px] tracking-tight text-[#1877F2]">
            StudySir
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-full">
                Log in
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" className="rounded-full bg-[#1877F2] hover:bg-[#166fe5]">
                Sign up free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
          {/* Type badge */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <TypeIcon className={`size-5 ${typeConfig.color}`} />
            <span className="text-sm font-semibold text-muted-foreground">{typeConfig.label}</span>
          </div>

          {/* Post image */}
          {post.image && (
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              <SafeImage src={post.image} alt={post.title} className="h-full w-full object-cover" />
            </div>
          )}

          {/* Post details */}
          <div className="p-5">
            <h1 className="text-2xl font-bold leading-tight">{post.title}</h1>

            {post.price && (
              <p className="mt-2 text-xl font-extrabold text-[#1877F2]">{post.price}</p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <div className="grid size-10 place-items-center rounded-full bg-muted">
                <UserCircle className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{post.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {post.targetType === 'teacher' ? 'Teacher on StudySir' : 'StudySir member'}
                </p>
              </div>
            </div>

            {post.description && (
              <div className="mt-4 rounded-lg bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.description}</p>
              </div>
            )}
          </div>

          {/* Subtle CTA - not forced login */}
          <div className="border-t bg-gradient-to-r from-blue-50 to-indigo-50 p-5 dark:from-blue-950/30 dark:to-indigo-950/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Interested in this {post.targetType}?</p>
                <p className="text-sm text-muted-foreground">Join StudySir to connect with {post.authorName}</p>
              </div>
              <Link href="/">
                <Button className="rounded-full bg-[#1877F2] px-6 hover:bg-[#166fe5] whitespace-nowrap">
                  Join Free
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          StudySir © {new Date().getFullYear()} — Connecting Students &amp; Teachers
        </p>
      </main>
    </div>
  )
}
