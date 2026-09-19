'use client'

// Public landing page for logged-out visitors (Task 19-b):
// Figma-style hero (EDUCATION quote + 3D students) with the live public feed below.

import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { FeedItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EmptyState } from '../shared/EmptyState'
import { UserAvatar } from '../shared/UserAvatar'
import { timeAgo } from '../shared/format'
import { Footer } from '../layout/Footer'

interface LandingViewProps {
  onLogin: () => void
  onSignup: () => void
}

const KIND_CHIP: Record<FeedItem['kind'], string> = {
  tuition: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  course: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  good: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  teacher: 'bg-green-500/15 text-green-700 dark:text-green-400',
  shared: 'bg-muted text-muted-foreground',
}

/** Normalized fields used to render one compact read-only feed card. */
interface CardModel {
  authorName: string
  authorAvatar: string | null
  createdAt: string
  title: string
  description: string
  price: string | null
  chips: string[]
}

const pkr = (n: number) => `PKR ${n.toLocaleString()}`

function splitSubjects(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
}

function cardModel(item: FeedItem): CardModel {
  switch (item.kind) {
    case 'tuition': {
      const t = item.tuition
      return {
        authorName: t.author.name,
        authorAvatar: t.author.avatar,
        createdAt: item.createdAt,
        title: t.title,
        description: t.description,
        price: `PKR ${t.feeMin.toLocaleString()}-${t.feeMax.toLocaleString()}`,
        chips: splitSubjects(t.subjects),
      }
    }
    case 'course': {
      const c = item.course
      return {
        authorName: c.teacher.name,
        authorAvatar: c.teacher.avatar,
        createdAt: item.createdAt,
        title: c.title,
        description: c.description,
        price: pkr(c.fee),
        chips: splitSubjects(c.subject),
      }
    }
    case 'good': {
      const g = item.good
      return {
        authorName: g.seller.name,
        authorAvatar: g.seller.avatar,
        createdAt: item.createdAt,
        title: g.title,
        description: g.description,
        price: pkr(g.price),
        chips: [],
      }
    }
    case 'teacher': {
      const t = item.teacher
      return {
        authorName: t.name,
        authorAvatar: t.avatar,
        createdAt: item.createdAt,
        title: t.headline ?? 'Teacher profile',
        description: t.bio ?? '',
        price: t.feeMin != null ? `PKR ${t.feeMin.toLocaleString()}-${(t.feeMax ?? t.feeMin).toLocaleString()}` : null,
        chips: t.city ? [t.city] : [],
      }
    }
    case 'shared': {
      const s = item.shared
      const inner = cardModel(s.target)
      return {
        authorName: s.author.name,
        authorAvatar: s.author.avatar,
        createdAt: item.createdAt,
        title: inner.title,
        description: s.text || inner.description,
        price: inner.price,
        chips: inner.chips,
      }
    }
  }
}

/** Small sticky top bar for public pages (duplicated on ReferralLanding by design). */
function PublicTopBar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <span className="shrink-0 font-logo text-[22px] tracking-tight text-[#1877F2]" aria-label="StudySir home">
          StudySir
        </span>
        {/* Decorative search — does nothing until you sign up (kept out of the a11y tree) */}
        <div className="hidden w-full max-w-xs justify-center md:flex" aria-hidden="true">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              tabIndex={-1}
              placeholder="Search Tuition"
              className="h-10 w-full rounded-full bg-muted pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <Button className="rounded-full bg-[#1877F2] px-5 hover:bg-[#166fe5]" onClick={onLogin}>
            Log in
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-[#1877F2] px-5 text-[#1877F2] hover:bg-blue-500/5"
            onClick={onSignup}
          >
            Sign up
          </Button>
        </div>
      </div>
    </header>
  )
}

function FeedCard({ item, onSignup }: { item: FeedItem; onSignup: () => void }) {
  const m = cardModel(item)
  return (
    <button
      type="button"
      onClick={onSignup}
      aria-label="Sign up to interact with this post"
      className="card-shadow min-w-0 w-full overflow-hidden rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <UserAvatar src={m.authorAvatar} name={m.authorName} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{m.authorName}</p>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                KIND_CHIP[item.kind]
              )}
            >
              {item.kind}
            </span>
            <span className="text-xs text-muted-foreground">· {timeAgo(m.createdAt)}</span>
          </div>
        </div>
      </div>

      <p className="mt-2.5 truncate font-bold leading-snug">{m.title}</p>
      {m.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {m.price ? <span className="text-sm font-bold">{m.price}</span> : null}
        {m.chips.map((chip) => (
          <span
            key={chip}
            className="max-w-[140px] truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {chip}
          </span>
        ))}
      </div>
    </button>
  )
}

export function LandingView({ onLogin, onSignup }: LandingViewProps) {
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.getFeed('all')
      setItems(d.items)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicTopBar onLogin={onLogin} onSignup={onSignup} />

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section aria-label="Education is the most powerful weapon" className="overflow-hidden bg-background">
          <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
            <div className="grid w-full grid-cols-2 items-end gap-x-4 gap-y-8 lg:grid-cols-[auto_1fr_auto] lg:gap-6">
              <div className="col-span-2 order-1 text-center lg:order-2 lg:col-span-1">
                <p className="font-logo text-4xl font-extrabold tracking-[0.3em] text-[#1877F2] sm:text-5xl md:text-6xl">
                  EDUCATION
                </p>
                <p className="mx-auto mt-4 max-w-xl text-xl font-bold leading-snug sm:text-2xl md:text-3xl">
                  is the most powerful weapon which you can use to{' '}
                  <span className="text-[#1877F2]">change the world.</span>
                </p>
                <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground sm:text-sm">
                  NELSON MANDELA
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    className="h-11 rounded-full bg-[#1877F2] px-7 hover:bg-[#166fe5]"
                    onClick={onSignup}
                  >
                    Find Your Tutor
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-[#1877F2] px-7 text-[#1877F2] hover:bg-blue-500/5"
                    onClick={onSignup}
                  >
                    Become a Tutor
                  </Button>
                </div>
              </div>

              {/* 3D girl — left of the text on desktop, left half of the image row on mobile */}
              <div className="order-2 flex justify-end lg:order-1 lg:justify-start">
                <img src="/hero/girl.png" alt="Student studying science" className="w-[22rem] md:w-[32rem] lg:w-[36rem]" />
              </div>
              {/* 3D boy — right of the text on desktop, right half of the image row on mobile */}
              <div className="order-3 flex justify-start lg:order-3 lg:justify-end">
                <img src="/hero/boy.png" alt="Student learning on a laptop" className="w-[18rem] md:w-[26rem] lg:w-[30rem]" />
              </div>
            </div>
          </div>
        </section>

        {/* ===== Public feed ===== */}
        <section aria-label="Latest on StudySir" className="mx-auto w-full max-w-5xl px-4 pb-12">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Latest on StudySir</h2>
            <p className="text-sm text-muted-foreground">See what students and teachers are posting right now</p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {items === null && !error
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)
              : null}

            {error && items === null ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={GraduationCap}
                  title="Couldn't load the feed"
                  hint="We couldn't reach StudySir. Check your connection and try again."
                  action={
                    <Button size="sm" onClick={() => void load()}>
                      Try again
                    </Button>
                  }
                />
              </div>
            ) : null}

            {items !== null && items.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyState
                  icon={GraduationCap}
                  title="No posts yet"
                  hint="Be the first to post a tuition request or a course — sign up to get started."
                />
              </div>
            ) : null}

            {items?.map((item, i) => (
              <FeedCard key={`${item.kind}-${i}`} item={item} onSignup={onSignup} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
