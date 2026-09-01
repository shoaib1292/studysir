'use client'

import { useCallback, useEffect, useState } from 'react'
import { PenLine, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { ReviewDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { FbCard } from '../shared/bits'
import { timeAgo } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'
import { Stars } from '../shared/Stars'
import { UserAvatar } from '../shared/UserAvatar'

function ReviewItem({ review, showTarget }: { review: ReviewDTO; showTarget?: boolean }) {
  const person = showTarget ? review.target : review.author
  return (
    <div className="flex gap-3 py-3">
      <UserAvatar src={person.avatar} name={person.name} className="size-10" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold">{person.name}</span>
          {showTarget ? <span className="text-xs text-muted-foreground">(your review)</span> : null}
          <Stars value={review.rating} />
        </div>
        {review.comment ? <p className="mt-0.5 text-sm text-foreground/90">{review.comment}</p> : null}
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(review.createdAt)}</p>
      </div>
    </div>
  )
}

export function ReviewsView() {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)

  const [about, setAbout] = useState<ReviewDTO[] | null>(null)
  const [written, setWritten] = useState<ReviewDTO[] | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await api.getUser(me.id)
      setAbout(d.reviews)
    } catch {
      setAbout([])
    }
    try {
      const d = await api.getWrittenReviews()
      setWritten(d.reviews)
    } catch {
      setWritten([])
    }
  }, [me.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Monetize Reviews</h1>
        <Button variant="outline" size="sm" onClick={() => go('feed')}>
          <PenLine className="size-4" />
          Review someone
        </Button>
      </div>

      <Tabs defaultValue="about" className="gap-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-72">
          <TabsTrigger value="about">About Me</TabsTrigger>
          <TabsTrigger value="wrote">I Wrote</TabsTrigger>
        </TabsList>

        <TabsContent value="about">
          {about === null ? (
            <FbCard className="space-y-3 p-4">
              <div className="h-12 animate-pulse rounded-lg bg-muted" />
              <div className="h-12 animate-pulse rounded-lg bg-muted" />
            </FbCard>
          ) : about.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              hint="Reviews from students and teachers you work with will appear here."
            />
          ) : (
            <FbCard className="divide-y px-4 py-1">
              {about.map((r) => (
                <ReviewItem key={r.id} review={r} />
              ))}
            </FbCard>
          )}
        </TabsContent>

        <TabsContent value="wrote">
          {written === null ? (
            <FbCard className="space-y-3 p-4">
              <div className="h-12 animate-pulse rounded-lg bg-muted" />
            </FbCard>
          ) : written.length === 0 ? (
            <EmptyState
              icon={Star}
              title="You haven’t written any reviews yet"
              hint="Visit a teacher’s profile and tap “Write Review” to share your experience."
            />
          ) : (
            <FbCard className="divide-y px-4 py-1">
              {written.map((r) => (
                <ReviewItem key={r.id} review={r} showTarget />
              ))}
            </FbCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
