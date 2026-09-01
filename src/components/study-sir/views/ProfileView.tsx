'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  BadgeCheck,
  Clock,
  GraduationCap,
  Handshake,
  MapPin,
  MessagesSquare,
  Pencil,
  Star,
  ThumbsUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, ApiError, errorMessage, type ProfileResponse } from '@/lib/api'
import type { ReviewDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { ConnectConfirmDialog } from '../dialogs/ConnectConfirmDialog'
import { NotEnoughCoinsDialog } from '../dialogs/NotEnoughCoinsDialog'
import { ReviewDialog } from '../dialogs/ReviewDialog'
import { FeedItemCard } from '../cards/FeedItemCard'
import { DIRECT_CONTACT_COST, ROLE_CHIP, ROLE_LABEL } from '../shared/constants'
import { FbCard } from '../shared/bits'
import { timeAgo } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'
import { ReviewRow } from '../shared/bits'
import { SafeImage } from '../shared/SafeImage'
import { Stars } from '../shared/Stars'
import { UserAvatar } from '../shared/UserAvatar'

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <FbCard className="overflow-hidden">
        <Skeleton className="h-44 w-full rounded-none md:h-56" />
        <div className="px-4 pb-5 pt-12">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
          <Skeleton className="mt-4 h-4 w-72" />
        </div>
      </FbCard>
      <CardSkeletonRow />
    </div>
  )
}

function CardSkeletonRow() {
  return (
    <FbCard className="space-y-3 p-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </FbCard>
  )
}

function ReviewList({
  reviews,
  emptyTitle,
  emptyHint,
}: {
  reviews: ReviewDTO[] | null
  emptyTitle: string
  emptyHint: string
}) {
  if (reviews === null) return <CardSkeletonRow />
  if (reviews.length === 0) return <EmptyState icon={Star} title={emptyTitle} hint={emptyHint} />
  return (
    <FbCard className="px-4 py-1">
      {reviews.map((r) => (
        <ReviewRow key={r.id} review={r} />
      ))}
    </FbCard>
  )
}

export function ProfileView() {
  const me = useAppStore((s) => s.me)!
  const params = useAppStore((s) => s.params)
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)
  const onlineIds = useAppStore((s) => s.onlineIds)

  const userId = params.userId || me.id
  const mine = userId === me.id

  const [data, setData] = useState<ProfileResponse | null>(null)
  const [hireOpen, setHireOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [notEnough, setNotEnough] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await api.getUser(userId))
    } catch {
      setData(null)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function connect() {
    if (!data || connecting) return
    setConnecting(true)
    try {
      const { connection } = await api.createConnection({ teacherId: data.user.id })
      await refreshMe()
      setHireOpen(false)
      toast.success('Request sent!', { description: 'Chat unlocked — say hi 👋' })
      go('chats', { connectionId: connection.id })
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setHireOpen(false)
        setNotEnough(true)
      } else {
        toast.error('Could not contact', { description: errorMessage(e) })
      }
    } finally {
      setConnecting(false)
    }
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <ProfileSkeleton />
      </div>
    )
  }

  const user = data.user
  const stats = data.stats
  const isTeacher = user.role === 'TEACHER'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <FbCard className="overflow-hidden">
        {/* Cover */}
        <div className="relative">
          <SafeImage
            src={user.coverImage}
            alt={user.name}
            className="h-44 w-full object-cover md:h-56"
            iconClassName="size-14"
          />
          <div className="absolute -bottom-10 left-4 md:left-6">
            <div className="relative">
              <UserAvatar src={user.avatar} name={user.name} className="size-28 ring-4 ring-white" />
              {onlineIds.includes(user.id) ? (
                <span
                  aria-label="Active now"
                  title="Active now"
                  className="absolute bottom-1 right-1 size-5 animate-pulse rounded-full border-4 border-white bg-green-500"
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="px-4 pb-5 pt-12 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-2xl font-bold">{user.name}</h1>
                {user.isVerified ? <BadgeCheck className="size-5 shrink-0 text-[#1877F2]" /> : null}
              </div>
              {user.headline ? <p className="truncate text-muted-foreground">{user.headline}</p> : null}
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {[user.city, user.country].filter(Boolean).join(' · ') || 'Anywhere'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', ROLE_CHIP[user.role])}>
                  {ROLE_LABEL[user.role]}
                </span>
                {isTeacher && user.feeMin !== null && user.feeMax !== null ? (
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Fee ${user.feeMin}–${user.feeMax}
                  </span>
                ) : null}
              </div>

              {/* Stats */}
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-4 text-[#1877F2]" />
                  <b className="text-foreground">{stats.connectionCount}</b> Connections
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ThumbsUp className="size-4 text-[#1877F2]" />
                  <b className="text-foreground">{stats.likeCount}</b> Likes
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Star className="size-4 text-amber-400" />
                  <b className="text-foreground">{stats.avgRating.toFixed(1)}</b> ({stats.reviewCount})
                </span>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {mine ? (
                <Button onClick={() => go('settings')}>
                  <Pencil className="size-4" />
                  Edit Profile
                </Button>
              ) : isTeacher ? (
                <>
                  <Button onClick={() => setHireOpen(true)} disabled={connecting}>
                    <Handshake className="size-4" />
                    Hire Teacher
                  </Button>
                  <Button variant="outline" onClick={connect} disabled={connecting}>
                    <MessagesSquare className="size-4" />
                    Message
                  </Button>
                </>
              ) : (
                <Button variant="outline" disabled>
                  Students can’t be hired
                </Button>
              )}
            </div>
          </div>
        </div>
      </FbCard>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="gap-4">
        <TabsList className={cn('grid w-full sm:w-96', isTeacher ? 'grid-cols-4 sm:w-[430px]' : 'grid-cols-3')}>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          {isTeacher ? <TabsTrigger value="students">Students</TabsTrigger> : null}
          <TabsTrigger value="availability">Time Availability</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {data.posts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No posts yet"
              hint={mine ? 'Share tuition needs, courses or study material from the feed.' : `${user.name} hasn’t posted anything yet.`}
            />
          ) : (
            data.posts.map((item) => (
              <FeedItemCard key={`${item.kind}-${item.kind === "tuition" ? item.tuition.id : item.kind === "course" ? item.course.id : item.kind === "good" ? item.good.id : item.teacher.id}`} item={item} onChanged={load} />
            ))
          )}
        </TabsContent>

        <TabsContent value="students">
          {data.students.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No students yet"
              hint="Students you've been hired for will appear here."
            />
          ) : (
            <FbCard className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {data.students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go('profile', { userId: s.id })}
                  className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                >
                  <UserAvatar src={s.avatar} name={s.name} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold hover:underline">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.headline ?? ROLE_LABEL[s.role]}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {[s.city, s.hiredAt ? `Hired ${timeAgo(s.hiredAt)}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <GraduationCap className="size-4 shrink-0 text-[#1877F2]" />
                </button>
              ))}
            </FbCard>
          )}
        </TabsContent>

        <TabsContent value="availability">
          {data.availabilities.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No schedule added yet"
              hint="This member hasn’t published their teaching hours."
            />
          ) : (
            <FbCard className="divide-y p-4">
              {data.availabilities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Clock className="mt-0.5 size-4 shrink-0 text-[#1877F2]" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{a.day}</p>
                    <p className="text-sm text-muted-foreground">{a.slots}</p>
                  </div>
                </div>
              ))}
            </FbCard>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-3">
          {!mine ? (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 card-shadow">
              <div className="flex items-center gap-3">
                <Stars value={stats.avgRating} showValue />
                <span className="text-sm text-muted-foreground">
                  {stats.reviewCount} review{stats.reviewCount === 1 ? '' : 's'}
                </span>
              </div>
              <Button size="sm" onClick={() => setReviewOpen(true)}>
                Write Review
              </Button>
            </div>
          ) : null}
          <ReviewList
            reviews={data.reviews}
            emptyTitle="No reviews yet"
            emptyHint={mine ? 'Reviews about you will appear here.' : 'Be the first to review this member.'}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConnectConfirmDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        title={`Hire ${user.name}?`}
        message="A chat unlocks instantly so you can discuss the details."
        cost={DIRECT_CONTACT_COST}
        balance={me.coins}
        confirmLabel={`Hire for ${DIRECT_CONTACT_COST} coins`}
        loading={connecting}
        onConfirm={connect}
      />
      <NotEnoughCoinsDialog
        open={notEnough}
        onOpenChange={setNotEnough}
        needed={DIRECT_CONTACT_COST}
        balance={me.coins}
      />
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        target={{ id: user.id, name: user.name, avatar: user.avatar }}
        onSubmitted={load}
      />
    </div>
  )
}
