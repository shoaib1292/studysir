'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import { StarPicker } from '../shared/Stars'
import { UserAvatar } from '../shared/UserAvatar'

export function ReviewDialog({
  open,
  onOpenChange,
  target,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: { id: string; name: string; avatar?: string | null }
  onSubmitted?: () => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (rating < 1 || loading) return
    setLoading(true)
    try {
      await api.createReview({
        targetId: target.id,
        rating,
        comment: comment.trim() || undefined,
      })
      toast.success('Review posted', { description: `Thanks for reviewing ${target.name}!` })
      onOpenChange(false)
      setRating(0)
      setComment('')
      onSubmitted?.()
    } catch (e) {
      toast.error('Could not post review', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>Share your experience with {target.name}.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg bg-muted/70 p-3">
          <UserAvatar src={target.avatar} name={target.name} className="size-10" />
          <span className="font-semibold">{target.name}</span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Your rating</p>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <Textarea
          placeholder={`How was ${target.name}? (optional)`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
        />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={rating < 1 || loading}>
            {loading ? 'Posting…' : 'Post Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
