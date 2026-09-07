'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Flag, MessageSquareText, MoreVertical, Share2, ThumbsUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, errorMessage } from '@/lib/api'
import type { GoodDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { BuyGoodDialog } from '../dialogs/BuyGoodDialog'
import { ReportDialog } from '../dialogs/ReportDialog'
import { ReviewDialog } from '../dialogs/ReviewDialog'
import { ShareDialog, type ShareContent } from '../dialogs/ShareDialog'
import { ActionGrid, CardAction, FbCard, StatText } from '../shared/bits'
import { RichText } from '../shared/RichText'
import { SafeImage } from '../shared/SafeImage'
import { useRequireAuth } from '../auth/useRequireAuth'

export function GoodCard({
  good,
  onChanged,
  embedded = false,
}: {
  good: GoodDTO
  onChanged?: () => void
  /** rendered inside a SharedPostCard wrapper — the Share action is hidden */
  embedded?: boolean
}) {
  const me = useAppStore((s) => s.me)
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)
  const { fmt } = useMoney(me ?? null)
  const { requireAuth, LoginPromptDialog } = useRequireAuth()

  const [liked, setLiked] = useState(good.myLike)
  const [likeCount, setLikeCount] = useState(good.likeCount)
  const [purchased, setPurchased] = useState(good.purchased)
  const [buyOpen, setBuyOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const shareContent: ShareContent = {
    targetType: 'GOOD',
    targetId: good.id,
    authorName: good.seller.name,
    authorAvatar: good.seller.avatar,
    authorRole: good.seller.role,
    emoji: '🛍️',
    title: good.title,
    byline: `— digital product by ${good.seller.name}`,
    description: good.description,
    price: `💰 Price: ${fmt(good.price)}`,
    image: good.image,
  }

  const sellerIsTeacher = good.seller.role === 'TEACHER'
  const isMine = me ? good.sellerId === me.id : false

  // Auth-protected action handlers
  const handleLike = () => requireAuth(toggleLike)
  const handleReview = () => requireAuth(() => setReviewOpen(true))
  const handleShare = () => requireAuth(() => setShareOpen(true))
  const handleDownload = () => requireAuth(download)
  const handleReport = () => requireAuth(() => setReportOpen(true))

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      const d = await api.like('GOOD', good.id)
      setLiked(d.liked)
      setLikeCount(d.likeCount)
    } catch (e) {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('Could not update like', { description: errorMessage(e) })
    }
  }

  function download() {
    if (!purchased) {
      setBuyOpen(true)
      return
    }
    // Real behavior: download a receipt + access file for the purchased item
    const lines = [
      '===============================================',
      '  StudySir — Digital Purchase Receipt',
      '===============================================',
      '',
      `Item:     ${good.title}`,
      `Seller:   ${good.seller.name}`,
      `Price:    PKR ${good.price}`,
      `Purchased by: ${me.name} (${me.email})`,
      `Date:     ${new Date().toLocaleString()}`,
      '',
      'Your download is available in Digital Store → Download',
      'at any time. Thank you for supporting teachers on StudySir!',
      '',
      '===============================================',
    ].join('\n')
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studysir-${good.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Receipt downloaded', { description: `${good.title} is yours. 🎉` })
  }

  return (
    <FbCard className="overflow-hidden">
      {/* Main content: Image left, Details right */}
      <div className="flex">
        {/* Left side - Product Image (1:1 aspect ratio) */}
        <div className="relative w-40 shrink-0 overflow-hidden bg-muted">
          <SafeImage
            src={good.image}
            alt={good.title}
            className="h-full w-full object-cover"
            iconClassName="size-10"
          />
          {/* Price overlay on image bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-lg font-extrabold text-white">{fmt(good.price)}</p>
          </div>
        </div>

        {/* Right side - Product Details */}
        <div className="flex min-w-0 flex-1 flex-col p-3">
          {/* Header with title and menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold leading-tight">{good.title}</h3>
              <p className="text-xs text-muted-foreground">
                by {good.seller.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {purchased ? (
                <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
                  Purchased
                </span>
              ) : null}
              {!isMine ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Report item"
                      title="Report item"
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleReport}
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

          {/* Description */}
          <div className="mt-2 flex-1">
            <p className="line-clamp-3 text-xs text-muted-foreground">
              {good.description}
            </p>
          </div>

          {/* Seller info */}
          <div className="mt-2 text-xs text-muted-foreground">
            Seller: <button
              type="button"
              className="font-semibold text-[#1877F2] hover:underline"
              onClick={() => go('profile', { userId: good.sellerId })}
            >
              {good.seller.name}
            </button>
          </div>
        </div>
      </div>

      {/* Action bar at bottom */}
      <div className="border-t px-2 py-1.5">
        <ActionGrid count={embedded ? 3 : 4}>
          <CardAction icon={ThumbsUp} label={`Like ${likeCount}`} active={liked} onClick={handleLike} />
          <CardAction
            icon={MessageSquareText}
            label="Review"
            disabled={!sellerIsTeacher}
            onClick={handleReview}
          />
          {!embedded ? <CardAction icon={Share2} label="Share" onClick={handleShare} /> : null}
          <CardAction icon={Download} label="Download" active={purchased} onClick={handleDownload} />
        </ActionGrid>
      </div>

      <BuyGoodDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        good={{ id: good.id, title: good.title, price: good.price, image: good.image }}
        balance={me?.money ?? 0}
        onBought={() => {
          setPurchased(true)
          void refreshMe()
          onChanged?.()
        }}
      />
      {sellerIsTeacher ? (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          target={{ id: good.sellerId, name: good.seller.name, avatar: good.seller.avatar }}
          onSubmitted={onChanged}
        />
      ) : null}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{
          type: 'GOOD',
          targetId: good.id,
          targetUserId: good.sellerId,
          label: good.title,
        }}
      />
      {!embedded ? (
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} content={shareContent} onShared={onChanged} />
      ) : null}
      {LoginPromptDialog}
    </FbCard>
  )
}
