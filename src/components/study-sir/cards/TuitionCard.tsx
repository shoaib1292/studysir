'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  Bookmark,
  BookOpen,
  Clock,
  Flag,
  GraduationCap,
  Handshake,
  Languages,
  MessagesSquare,
  MoreHorizontal,
  Pencil,
  Share2,
  ThumbsUp,
  XCircle,
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
import { PostTuitionDialog } from '../dialogs/PostTuitionDialog'
import { ReportDialog } from '../dialogs/ReportDialog'
import { ShareDialog, type ShareContent } from '../dialogs/ShareDialog'
import { ActionGrid, CardAction, DetailRow, FbCard, StatText, TuitionStatusBadge } from '../shared/bits'
import { RichText } from '../shared/RichText'
import { UserAvatar } from '../shared/UserAvatar'
import { timeAgo } from '../shared/format'
import { useMoney } from '@/store/useCurrencyStore'

export function TuitionCard({
  tuition,
  onChanged,
  showOwnerActions = false,
  embedded = false,
}: {
  tuition: TuitionPostDTO
  onChanged?: () => void
  showOwnerActions?: boolean
  /** rendered inside a SharedPostCard wrapper — the Share action is hidden */
  embedded?: boolean
}) {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)
  const { fmt } = useMoney(me)

  const isMine = tuition.authorId === me.id
  const isTeacherViewer = me.role === 'TEACHER'

  const [liked, setLiked] = useState(tuition.myLike)
  const [likeCount, setLikeCount] = useState(tuition.likeCount)
  const [status, setStatus] = useState(tuition.status)
  const [saved, setSaved] = useState(tuition.mySave)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [notEnough, setNotEnough] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const shareContent: ShareContent = {
    targetType: 'TUITION',
    targetId: tuition.id,
    authorName: tuition.author.name,
    authorAvatar: tuition.author.avatar,
    authorRole: tuition.author.role,
    emoji: '📚',
    title: tuition.title,
    byline: `— ${tuition.mode === 'ONLINE' ? 'Online tuition' : tuition.mode === 'HOME' ? 'Home tuition' : 'Center tuition'} request by ${tuition.author.name}`,
    details: [
      ['Subjects', tuition.subjects ?? ''],
      ['Languages', tuition.languages ?? ''],
      ['Qualification', tuition.qualification ?? ''],
      ['Timing', tuition.timing ?? ''],
      ['City', tuition.city ?? ''],
    ],
    description: tuition.description,
    price: `💰 Fee range: ${fmt(tuition.feeMin)} – ${fmt(tuition.feeMax)}`,
  }

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

  async function toggleSave() {
    const next = !saved
    setSaved(next)
    try {
      const d = await api.toggleSave(tuition.id)
      setSaved(d.saved)
      toast.success(d.saved ? 'Saved to your list' : 'Removed from saved', {
        description: d.saved
          ? 'Find it anytime under Tution → Saved.'
          : undefined,
      })
      onChanged?.()
    } catch (e) {
      setSaved(!next)
      toast.error('Could not update saved list', { description: errorMessage(e) })
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
      toast.success(connection.status === 'ACTIVE' ? 'Request accepted!' : 'Request sent!', {
        description:
          connection.status === 'ACTIVE'
            ? `${tuition.coinCost} coins deducted — chat unlocked. Say salam 👋`
            : 'The student will see you in their requests once accepted.',
      })
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
          {!isMine ? (
            <button
              type="button"
              aria-label={saved ? 'Remove from saved' : 'Save post'}
              title={saved ? 'Saved — tap to remove' : 'Save for later'}
              onClick={toggleSave}
              className={cn(
                'rounded-full p-1.5 transition-colors hover:bg-muted',
                saved ? 'text-[#1877F2] dark:text-blue-400' : 'text-muted-foreground'
              )}
            >
              <Bookmark className={cn('size-5', saved && 'fill-current')} />
            </button>
          ) : null}
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
                <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2">
                  <Pencil className="size-4" />
                  Edit Post
                </DropdownMenuItem>
                {status === 'OPEN' ? (
                  <DropdownMenuItem onClick={closePost} className="gap-2 text-red-600 focus:text-red-600">
                    <XCircle className="size-4" />
                    Close Post
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>Closed</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {!isMine ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Report post"
                  title="Report post"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Flag className="size-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setReportOpen(true)}
                  className="gap-2 text-red-600 focus:text-red-600"
                >
                  <Flag className="size-4" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 px-4 pb-4">
        <h3 className="text-[17px] font-bold leading-snug">{tuition.title}</h3>
        <RichText text={tuition.description} keywords={[tuition.subjects, tuition.city]} clamp={4} />
        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3">
          <DetailRow icon={Languages} label="Languages" value={tuition.languages} />
          <DetailRow icon={BookOpen} label="Subjects" value={tuition.subjects} />
          <DetailRow icon={GraduationCap} label="Required Qualification" value={tuition.qualification} />
          <DetailRow icon={Banknote} label="Fee Range" value={`${fmt(tuition.feeMin)} – ${fmt(tuition.feeMax)}`} bold />
          <DetailRow icon={Clock} label="Timing" value={tuition.timing} />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-3 pb-2 pt-1.5">
        <StatText>{likeCount} Likes</StatText>
        <ActionGrid
          count={
            2 +
            (embedded ? -1 : 0) +
            (isTeacherViewer && !isMine ? 1 : 0) +
            (isTeacherViewer || (isMine && tuition.existingConnectionId) ? 1 : 0)
          }
        >
          <CardAction icon={ThumbsUp} label="Like" active={liked} onClick={toggleLike} />
          {!embedded ? <CardAction icon={Share2} label="Share" onClick={() => setShareOpen(true)} /> : null}
          {isTeacherViewer && !isMine ? (
            <CardAction icon={Handshake} label={`Accept · ${tuition.coinCost}`} onClick={startContact} />
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
        title="Accept this tuition?"
        message={`Accepting "${tuition.title}" will deduct ${tuition.coinCost} coins from your balance and unlock the chat with the student. If the student never replies in 10 days, coins are auto-refunded.`}
        cost={tuition.coinCost}
        balance={me.coins}
        confirmLabel={`Accept for ${tuition.coinCost} coins`}
        loading={connecting}
        onConfirm={confirmConnect}
      />
      <NotEnoughCoinsDialog
        open={notEnough}
        onOpenChange={setNotEnough}
        needed={tuition.coinCost}
        balance={me.coins}
      />
      <PostTuitionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        post={tuition}
        onPosted={onChanged ?? (() => undefined)}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{
          type: 'TUITION',
          targetId: tuition.id,
          targetUserId: tuition.authorId,
          label: tuition.title,
        }}
      />
      {!embedded ? (
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} content={shareContent} onShared={onChanged} />
      ) : null}
    </FbCard>
  )
}
