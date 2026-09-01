'use client'

import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Presentation, SearchX, ShoppingBag, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { FeedItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { PostCourseDialog } from '../dialogs/PostCourseDialog'
import { PostGoodDialog } from '../dialogs/PostGoodDialog'
import { PostTuitionDialog } from '../dialogs/PostTuitionDialog'
import { FeedItemCard } from '../cards/FeedItemCard'
import { CardSkeleton, FbCard } from '../shared/bits'
import { firstName } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'
import { UserAvatar } from '../shared/UserAvatar'

type FeedType = 'all' | 'tuition' | 'course' | 'good' | 'teacher'
type ComposerDialog = 'tuition' | 'course' | 'good' | null

const FILTERS: Array<{ key: FeedType; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'tuition', label: 'Tutions' },
  { key: 'course', label: 'Courses' },
  { key: 'good', label: 'Store' },
  { key: 'teacher', label: 'Teachers' },
]

function ComposerCard({ onOpen }: { onOpen: (d: Exclude<ComposerDialog, null>) => void }) {
  const me = useAppStore((s) => s.me)!
  const isTeacher = me.role === 'TEACHER'

  return (
    <FbCard className="p-3">
      <div className="flex items-center gap-2">
        <UserAvatar src={me.avatar} name={me.name} />
        <button
          type="button"
          onClick={() => onOpen('tuition')}
          className="flex-1 rounded-full bg-[#F0F2F5] px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-[#E4E6EB]"
        >
          Hi {firstName(me.name)}! Post Your tution here
        </button>
      </div>

      <div className="my-2 border-t" />

      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => onOpen('tuition')}
          className="flex items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <GraduationCap className="size-5 text-green-600" />
          Post Tution
        </button>
        <span title={isTeacher ? undefined : 'Only teachers can post courses'}>
          <button
            type="button"
            disabled={!isTeacher}
            onClick={() => onOpen('course')}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Presentation className="size-5 text-blue-600" />
            Post Course
          </button>
        </span>
        <span title={isTeacher ? undefined : 'Only teachers can sell items'}>
          <button
            type="button"
            disabled={!isTeacher}
            onClick={() => onOpen('good')}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ShoppingBag className="size-5 text-amber-600" />
            Sell Item
          </button>
        </span>
      </div>
    </FbCard>
  )
}

export function FeedView() {
  const params = useAppStore((s) => s.params)
  const nonce = useAppStore((s) => s.nonce)
  const replace = useAppStore((s) => s.replace)

  const [type, setType] = useState<FeedType>('all')
  const [state, setState] = useState<{ key: string; items: FeedItem[] } | null>(null)
  const [dialog, setDialog] = useState<ComposerDialog>(null)

  const q = params.q
  const feedKey = `${type}:${q ?? ''}:${nonce}`
  // Derived: null while (re)loading this filter/search combination (shows skeletons)
  const items = state && state.key === feedKey ? state.items : null

  useEffect(() => {
    let cancelled = false
    api
      .getFeed(type, q || undefined)
      .then((d) => {
        if (!cancelled) setState({ key: feedKey, items: d.items })
      })
      .catch(() => {
        if (!cancelled) setState({ key: feedKey, items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [feedKey, type, q])

  /** Re-fetch for event handlers (post created, like toggled, …). */
  const refresh = useCallback(() => {
    return api
      .getFeed(type, q || undefined)
      .then((d) => setState({ key: feedKey, items: d.items }))
      .catch(() => setState({ key: feedKey, items: [] }))
  }, [type, q, feedKey])

  return (
    <div className="mx-auto w-full max-w-[680px]">
      {/* Search result chip */}
      {q ? (
        <div className="mb-3 flex items-center justify-center">
          <span className="card-shadow flex items-center gap-2 rounded-full bg-card py-1.5 pl-4 pr-2 text-sm">
            <span>
              Results for <b>&lsquo;{q}&rsquo;</b>
            </span>
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => replace('feed', {})}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </span>
        </div>
      ) : null}

      {/* Filter chips */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setType(f.key)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
              type === f.key
                ? 'bg-[#1877F2] text-white shadow-sm'
                : 'bg-card text-foreground/80 hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <ComposerCard onOpen={setDialog} />

        {items === null ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing here yet"
            hint={q ? `No results match “${q}”. Try a different search or filter.` : 'Be the first to post in this category!'}
          />
        ) : (
          items.map((item) => <FeedItemCard key={`${item.kind}-${item.kind === "tuition" ? item.tuition.id : item.kind === "course" ? item.course.id : item.kind === "good" ? item.good.id : item.teacher.id}`} item={item} onChanged={refresh} />)
        )}
      </div>

      <PostTuitionDialog
        open={dialog === 'tuition'}
        onOpenChange={(o) => !o && setDialog(null)}
        onPosted={refresh}
      />
      <PostCourseDialog
        open={dialog === 'course'}
        onOpenChange={(o) => !o && setDialog(null)}
        onPosted={refresh}
      />
      <PostGoodDialog
        open={dialog === 'good'}
        onOpenChange={(o) => !o && setDialog(null)}
        onPosted={refresh}
      />
    </div>
  )
}
