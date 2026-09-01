'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  BookOpen,
  Clock,
  GraduationCap,
  Handshake,
  Languages,
  MessageSquareText,
  MessagesSquare,
  MoreHorizontal,
  ThumbsUp,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { TuitionPostDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { ConnectConfirmDialog } from '../dialogs/ConnectConfirmDialog'
import { NotEnoughCoinsDialog } from '../dialogs/NotEnoughCoinsDialog'
import { ActionGrid, CardAction, DetailRow, FbCard, StatText, TuitionStatusBadge } from '../shared/bits'
import { RichText } from '../shared/RichText'
import { Stars } from '../shared/Stars'
import { UserAvatar } from '../shared/UserAvatar'
import { timeAgo } from '../shared/format'

type TuitionWithRating = TuitionPostDTO & { authorAvgRating?: number }

export function TuitionCard({
  tuition,
  onChanged,
  showOwnerActions = false,
}: {
  tuition: TuitionPostDTO
  onChanged?: () => void
  showOwnerActions?: boolean
}) {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)

  const isMine = tuition.authorId === me.id
  const isTeacherViewer = me.role === 'TEACHER'

  const [liked, setLiked] = useState(tuition.myLike)
  const [likeCount, setLikeCount] = useState(tuition.likeCount)
  const [status, setStatus] = useState(tuition.status)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [notEnough, setNotEnough] = useState(false)

  const authorRating = (tuition as TuitionWithRating).authorAvgRating

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      const d = await api.like('TUITION', tuition.id)
      setLiked(d.liked)
      setLikeCount(d.likeCount)
    } catch (e) {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('Could not update like', { description: errorMessage(e) })
    }
  }

  function startContact() {
    if (tuition.existingConnectionId) {
      go('chats', { connectionId: tuition.existingConnectionId })
      return
    }
    setConfirmOpen(true)
  }

  async function confirmConnect() {
    setConnecting(true)
    try {
      const { connection } = await api.createConnection({ tuitionPostId: tuition.id })
      void refreshMe()
      setConfirmOpen(false)
      toast.success('Request sent!', { description: 'Chat unlocked — say hi 👋' })
      go('chats', { connectionId: connection.id })
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setConfirmOpen(false)
        setNotEnough(true)
      } else {
        toast.error('Could not contact', { description: errorMessage(e) })
      }
    } finally {
      setConnecting(false)
    }
  }

  async function closePost() {
    try {
      const d = await api.updateTuition(tuition.id, { status: 'CLOSED' })
      setStatus(d.tuition.status)
      toast.success('Post closed')
      onChanged?.()
    } catch (e) {
      toast.error('Could not close post', { description: errorMessage(e) })
    }
  }

  return (
    <FbCard>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <UserAvatar
          src={tuition.author.avatar}
          name={tuition.author.name}
          onClick={() => go('profile', { userId: tuition.authorId })}
        />
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => go('profile', { userId: tuition.authorId })}
        >
          <p className="font-bold leading-tight hover:underline">{tuition.author.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {tuition.city ?? tuition.author.city ?? 'Anywhere'} · {timeAgo(tuition.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isMine ? (
            <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">Hire</span>
          ) : null}
          {isMine ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Post options"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <MoreHorizontal className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status === 'OPEN' ? (
                  <DropdownMenuItem onClick={closePost} className="text-red-600 focus:text-red-600">
                    Close Post
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>Closed</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 px-4 pb-4">
        {typeof authorRating === 'number' ? <Stars value={authorRating} showValue /> : null}
        <h3 className="text-[17px] font-bold leading-snug">{tuition.title}</h3>
        <RichText text={tuition.description} keywords={[tuition.subjects, tuition.city]} clamp={4} />
        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3">
          <DetailRow icon={Languages} label="Languages" value={tuition.languages} />
          <DetailRow icon={BookOpen} label="Subjects" value={tuition.subjects} />
          <DetailRow icon={GraduationCap} label="Required Qualification" value={tuition.qualification} />
          <DetailRow icon={Banknote} label="Fee Range" value={`$${tuition.feeMin} – $${tuition.feeMax}`} bold />
          <DetailRow icon={Clock} label="Timing" value={tuition.timing} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-3 pb-2 pt-1.5">
        <StatText>{likeCount} Likes</StatText>
        <ActionGrid
          count={
            2 +
            (isTeacherViewer && !isMine ? 1 : 0) +
            (isTeacherViewer || (isMine && tuition.existingConnectionId) ? 1 : 0)
          }
        >
          <CardAction icon={ThumbsUp} label="Like" active={liked} onClick={toggleLike} />
          <CardAction icon={MessageSquareText} label="Review" disabled />
          {isTeacherViewer && !isMine ? (
            <CardAction icon={Handshake} label="Hire" onClick={startContact} />
          ) : null}
          {isTeacherViewer || (isMine && tuition.existingConnectionId) ? (
            <CardAction icon={MessagesSquare} label="Live Chat" onClick={startContact} />
          ) : null}
        </ActionGrid>

        {showOwnerActions && isMine ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t px-1 pt-2.5">
            <div className="flex items-center gap-2">
              <TuitionStatusBadge status={status} />
              <span className="text-sm text-muted-foreground">
                {tuition.connectionCount ?? 0} teachers contacted
              </span>
            </div>
            {status === 'OPEN' ? (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:text-red-400"
                onClick={closePost}
              >
                Close Post
              </Button>
            ) : (
              <span className={cn('text-xs text-muted-foreground')}>No new requests</span>
            )}
          </div>
        ) : null}
      </div>

      {/* Dialogs */}
      <ConnectConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Contact this tuition?"
        message={`You are about to approach "${tuition.title}". Chat unlocks instantly after this.`}
        cost={tuition.coinCost}
        balance={me.coins}
        confirmLabel={`Contact for ${tuition.coinCost} coins`}
        loading={connecting}
        onConfirm={confirmConnect}
      />
      <NotEnoughCoinsDialog
        open={notEnough}
        onOpenChange={setNotEnough}
        needed={tuition.coinCost}
        balance={me.coins}
      />
    </FbCard>
  )
}
