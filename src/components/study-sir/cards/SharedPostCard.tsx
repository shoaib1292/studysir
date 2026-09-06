'use client'

// Facebook-style share wrapper: "<user> shared a post" with the ORIGINAL post
// embedded inside (rendered by the real cards in embedded mode), likes on the
// share itself, re-share and owner delete.
import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Share2, ThumbsUp, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, errorMessage } from '@/lib/api'
import type { SharedPostDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { FeedItemCard } from './FeedItemCard'
import { ShareDialog, shareContentForFeedItem } from '../dialogs/ShareDialog'
import { ActionGrid, CardAction, FbCard, StatText } from '../shared/bits'
import { UserAvatar } from '../shared/UserAvatar'
import { timeAgo } from '../shared/format'

export function SharedPostCard({ shared, onChanged }: { shared: SharedPostDTO; onChanged?: () => void }) {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const { fmt } = useMoney(me)

  const [liked, setLiked] = useState(shared.myLike)
  const [likeCount, setLikeCount] = useState(shared.likeCount)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isMine = shared.author.id === me.id

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      const d = await api.like('SHARED', shared.id)
      setLiked(d.liked)
      setLikeCount(d.likeCount)
    } catch (e) {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('Could not update like', { description: errorMessage(e) })
    }
  }

  async function deleteShare() {
    if (deleting) return
    setDeleting(true)
    try {
      await api.deleteShare(shared.id)
      toast.success('Share deleted')
      onChanged?.()
    } catch (e) {
      toast.error('Could not delete share', { description: errorMessage(e) })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <FbCard>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <UserAvatar
          src={shared.author.avatar}
          name={shared.author.name}
          onClick={() => go('profile', { userId: shared.author.id })}
        />
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => go('profile', { userId: shared.author.id })}
        >
          <p className="leading-tight">
            <span className="font-bold hover:underline">{shared.author.name}</span>{' '}
            <span className="text-muted-foreground">shared a post</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {shared.author.city ?? 'Anywhere'} · {timeAgo(shared.createdAt)}
          </p>
        </div>
      </div>

      {/* sharer's caption */}
      {shared.text ? (
        <p className="whitespace-pre-wrap px-4 pb-3 text-sm">{shared.text}</p>
      ) : null}

      {/* embedded original post (never itself a share — recursion-safe) */}
      <div className="mx-4 mb-3 overflow-hidden rounded-xl border">
        <FeedItemCard item={shared.target} onChanged={onChanged} embedded />
      </div>

      {/* Footer */}
      <div className="border-t px-3 pb-2 pt-1.5">
        <StatText>{likeCount} Likes</StatText>
        <ActionGrid count={isMine ? 3 : 2}>
          <CardAction icon={ThumbsUp} label="Like" active={liked} onClick={toggleLike} />
          <CardAction icon={Share2} label="Share" onClick={() => setShareOpen(true)} />
          {isMine ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Share options"
                  disabled={deleting}
                  className="flex h-9 min-w-0 items-center justify-center rounded-md px-1 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <MoreHorizontal className="size-[18px] shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={deleteShare}
                  className="gap-2 text-red-600 focus:text-red-600"
                >
                  <Trash2 className="size-4" />
                  Delete share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </ActionGrid>
      </div>

      {/* re-share composer (re-shares the embedded original) */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        content={shareOpen ? shareContentForFeedItem(shared.target, fmt) : null}
        onShared={onChanged}
      />
    </FbCard>
  )
}
