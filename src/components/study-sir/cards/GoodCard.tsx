'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, MessageSquareText, Share2, ThumbsUp } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import type { GoodDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { BuyGoodDialog } from '../dialogs/BuyGoodDialog'
import { ReviewDialog } from '../dialogs/ReviewDialog'
import { ActionGrid, CardAction, FbCard, StatText } from '../shared/bits'
import { RichText } from '../shared/RichText'
import { SafeImage } from '../shared/SafeImage'

export function GoodCard({ good, onChanged }: { good: GoodDTO; onChanged?: () => void }) {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)

  const [liked, setLiked] = useState(good.myLike)
  const [likeCount, setLikeCount] = useState(good.likeCount)
  const [purchased, setPurchased] = useState(good.purchased)
  const [buyOpen, setBuyOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const sellerIsTeacher = good.seller.role === 'TEACHER'

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

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ title: good.title, text: good.description ?? good.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  }

  function download() {
    if (purchased) {
      toast.success('Check your downloads', { description: `${good.title} is ready.` })
    } else {
      setBuyOpen(true)
    }
  }

  return (
    <FbCard className="flex flex-col overflow-hidden">
      <SafeImage src={good.image} alt={good.title} className="h-56 w-full shrink-0 object-cover" iconClassName="size-14" />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-bold leading-snug">{good.title}</h3>
          {purchased ? (
            <span className="shrink-0 rounded bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
              Purchased
            </span>
          ) : null}
        </div>
        <RichText text={good.description} clamp={3} />
        <div className="mt-auto space-y-1 pt-2">
          <p className="text-xl font-extrabold">Rs {good.price}</p>
          <p className="text-sm text-muted-foreground">
            Seller:{' '}
            <button
              type="button"
              className="font-semibold text-[#1877F2] hover:underline"
              onClick={() => go('profile', { userId: good.sellerId })}
            >
              {good.seller.name}
            </button>
          </p>
        </div>
      </div>

      <div className="border-t px-3 pb-2 pt-1.5">
        <StatText>{likeCount} Likes</StatText>
        <ActionGrid count={4}>
          <CardAction icon={ThumbsUp} label="Like" active={liked} onClick={toggleLike} />
          <CardAction
            icon={MessageSquareText}
            label="Review"
            disabled={!sellerIsTeacher}
            onClick={() => setReviewOpen(true)}
          />
          <CardAction icon={Share2} label="Share" onClick={share} />
          <CardAction icon={Download} label="Download" active={purchased} onClick={download} />
        </ActionGrid>
      </div>

      <BuyGoodDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        good={{ id: good.id, title: good.title, price: good.price, image: good.image }}
        balance={me.money}
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
    </FbCard>
  )
}
