'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { BadgeCheck, Clock, Handshake, MessageSquareText, Send, ThumbsUp, Users } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import type { TeacherCardDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { ConnectConfirmDialog } from '../dialogs/ConnectConfirmDialog'
import { ReviewDialog } from '../dialogs/ReviewDialog'
import { TimingDialog } from '../dialogs/TimingDialog'
import { ActionGrid, CardAction, FbCard, StatText } from '../shared/bits'
import { RichText } from '../shared/RichText'
import { Stars } from '../shared/Stars'
import { SafeImage } from '../shared/SafeImage'
import { UserAvatar } from '../shared/UserAvatar'

export function TeacherCard({ teacher, onChanged }: { teacher: TeacherCardDTO; onChanged?: () => void }) {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)

  const [liked, setLiked] = useState(teacher.myLike)
  const [likeCount, setLikeCount] = useState(teacher.likeCount)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [timingOpen, setTimingOpen] = useState(false)
  const [hireOpen, setHireOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      const d = await api.like('TEACHER', teacher.id)
      setLiked(d.liked)
      setLikeCount(d.likeCount)
    } catch (e) {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('Could not update like', { description: errorMessage(e) })
    }
  }

  async function hire() {
    setConnecting(true)
    try {
      const { connection } = await api.createConnection({ teacherId: teacher.id })
      void refreshMe()
      setHireOpen(false)
      toast.success('Request sent — FREE!', {
        description: `${teacher.name} accepts it to unlock the chat. You'll be notified.`,
      })
      go('chats', { connectionId: connection.id })
    } catch (e) {
      toast.error('Could not send request', { description: errorMessage(e) })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <FbCard className="overflow-hidden">
      {teacher.coverImage ? (
        <SafeImage src={teacher.coverImage} alt={`${teacher.name} cover`} className="h-28 w-full object-cover" />
      ) : null}

      <div className="p-4 pt-3">
        <div className="flex items-start gap-3">
          <UserAvatar
            src={teacher.avatar}
            name={teacher.name}
            className={cn('size-20', teacher.coverImage && '-mt-12 ring-4 ring-white')}
            dot="bg-green-500"
            onClick={() => go('profile', { userId: teacher.id })}
          />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => go('profile', { userId: teacher.id })}
              className="flex items-center gap-1 font-bold leading-tight hover:underline"
            >
              <span className="truncate">{teacher.name}</span>
              {teacher.isVerified ? <BadgeCheck className="size-4 shrink-0 text-[#1877F2]" /> : null}
            </button>
            {teacher.headline ? (
              <p className="truncate text-sm text-muted-foreground">{teacher.headline}</p>
            ) : null}
            {teacher.city ? <p className="truncate text-xs text-muted-foreground">{teacher.city}</p> : null}
          </div>
          <div className="shrink-0 space-y-1.5 text-right">
            <div className="flex items-center justify-end gap-1">
              <Stars value={teacher.avgRating} showValue />
            </div>
            <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              Connection {teacher.hireCount}
            </p>
            <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <ThumbsUp className="size-3.5" />
              Likes {likeCount}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {teacher.bio ? <RichText text={teacher.bio} clamp={3} /> : null}
          {teacher.gender ? (
            <p className="text-sm">
              <span className="font-bold">Gender: </span>
              {teacher.gender}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t px-3 pb-2 pt-1.5">
        <StatText>
          {likeCount} Likes · {teacher.reviewCount} Reviews
        </StatText>
        <ActionGrid count={4}>
          <CardAction icon={ThumbsUp} label="Like" active={liked} onClick={toggleLike} />
          <CardAction icon={MessageSquareText} label="Review" onClick={() => setReviewOpen(true)} />
          <CardAction icon={Clock} label="Timing" onClick={() => setTimingOpen(true)} />
          <CardAction icon={Handshake} label="Hire Teacher" primary onClick={() => setHireOpen(true)} />
        </ActionGrid>
      </div>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        target={{ id: teacher.id, name: teacher.name, avatar: teacher.avatar }}
        onSubmitted={onChanged}
      />
      <TimingDialog
        open={timingOpen}
        onOpenChange={setTimingOpen}
        teacherId={teacher.id}
        teacherName={teacher.name}
      />
      <ConnectConfirmDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        title={`Request ${teacher.name}?`}
        message={`Your request is FREE. ${teacher.name} accepts it to unlock the chat — accepting costs the teacher coins, not you.`}
        cost={0}
        balance={me.coins}
        confirmLabel="Send Request — Free"
        confirmIcon={Send}
        loading={connecting}
        onConfirm={hire}
      />
    </FbCard>
  )
}
