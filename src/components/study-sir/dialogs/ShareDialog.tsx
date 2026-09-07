'use client'

// Facebook-style sharing (requirement M, v2): sharing creates a REAL post on the
// feed via api.shareToFeed — the feed renders "<user> shared a post" with the
// original post embedded inside the wrapper card, exactly like Facebook.
// This composer still offers copy-text / WhatsApp of the rich post content.
import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Facebook, Linkedin, Link, Loader2, MessageCircle, Send, Share2, Twitter } from 'lucide-react'
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
import { api, errorMessage, type ShareTargetType } from '@/lib/api'
import type { FeedItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { ROLE_CHIP, ROLE_LABEL } from '../shared/constants'
import { SafeImage } from '../shared/SafeImage'
import { UserAvatar } from '../shared/UserAvatar'

export interface ShareContent {
  /** headline line, e.g. "Math Tuition Needed — Class 9" */
  title: string
  /** key/value detail lines rendered in the shared text */
  details?: [string, string][]
  /** main body text */
  description?: string | null
  /** author line, e.g. "— posted by Ahmed Raza" */
  byline?: string
  /** fee / price line highlighted at the end */
  price?: string
  /** emoji shown above the text */
  emoji?: string
  /** feed target type — required to post the share to the feed */
  targetType: ShareTargetType
  /** id of the post being shared */
  targetId: string
  /** original author, shown on the embedded preview card */
  authorName: string
  authorAvatar: string | null
  /** optional role chip on the embedded preview (STUDENT/PARENT/TEACHER) */
  authorRole?: string | null
  /** optional image (good/course photo, teacher cover) on the embedded preview */
  image?: string | null
}

export function composeShareText(c: ShareContent): string {
  const lines: string[] = []
  if (c.emoji) lines.push(c.emoji)
  lines.push(c.title)
  if (c.byline) lines.push(c.byline)
  if (c.details?.length) {
    lines.push('')
    for (const [k, v] of c.details) {
      if (v) lines.push(`• ${k}: ${v}`)
    }
  }
  if (c.description) {
    lines.push('')
    lines.push(c.description)
  }
  if (c.price) {
    lines.push('')
    lines.push(c.price)
  }
  lines.push('')
  lines.push('— shared from StudySir 📚')
  return lines.join('\n')
}

/**
 * Builds ShareContent from any feed item (used by SharedPostCard for re-share).
 * `fmtMoney` formats PKR-base amounts in the viewer's currency — pass `fmt`
 * from useMoney(me); plain functions can't call hooks themselves.
 */
export function shareContentForFeedItem(item: FeedItem, fmtMoney: (n: number) => string): ShareContent | null {
  switch (item.kind) {
    case 'tuition': {
      const t = item.tuition
      return {
        targetType: 'TUITION',
        targetId: t.id,
        authorName: t.author.name,
        authorAvatar: t.author.avatar,
        authorRole: t.author.role,
        emoji: '📚',
        title: t.title,
        byline: `— ${t.mode === 'ONLINE' ? 'Online tuition' : t.mode === 'HOME' ? 'Home tuition' : 'Center tuition'} request by ${t.author.name}`,
        details: [
          ['Subjects', t.subjects ?? ''],
          ['Languages', t.languages ?? ''],
          ['Qualification', t.qualification ?? ''],
          ['Timing', t.timing ?? ''],
          ['City', t.city ?? ''],
        ],
        description: t.description,
        price: `💰 Fee range: ${fmtMoney(t.feeMin)} – ${fmtMoney(t.feeMax)}`,
      }
    }
    case 'course': {
      const c = item.course
      return {
        targetType: 'COURSE',
        targetId: c.id,
        authorName: c.teacher.name,
        authorAvatar: c.teacher.avatar,
        authorRole: c.teacher.role,
        emoji: '🎓',
        title: c.title,
        byline: `— course by ${c.teacher.name}`,
        details: [
          ['Subject', c.subject ?? ''],
          ['Language', c.language ?? ''],
          ['Duration', c.duration ?? ''],
          ['Timing', c.timing ?? ''],
          ['Format', c.format ?? ''],
        ],
        description: c.description,
        price: `💰 Price: ${fmtMoney(c.fee)}`,
        image: c.cover,
      }
    }
    case 'good': {
      const g = item.good
      return {
        targetType: 'GOOD',
        targetId: g.id,
        authorName: g.seller.name,
        authorAvatar: g.seller.avatar,
        authorRole: g.seller.role,
        emoji: '🛍️',
        title: g.title,
        byline: `— digital item by ${g.seller.name}`,
        description: g.description,
        price: `💰 ${fmtMoney(g.price)}`,
        image: g.image,
      }
    }
    case 'teacher': {
      const t = item.teacher
      return {
        targetType: 'TEACHER',
        targetId: t.id,
        authorName: t.name,
        authorAvatar: t.avatar,
        authorRole: 'TEACHER',
        emoji: '👨‍🏫',
        title: `${t.name} — ${t.headline ?? 'Teacher'}`,
        byline: t.city ? `— ${t.city} teacher on StudySir` : '— teacher on StudySir',
        price:
          t.feeMin !== null && t.feeMax !== null
            ? `💰 Fee range: ${fmtMoney(t.feeMin)} – ${fmtMoney(t.feeMax)}`
            : undefined,
        image: t.avatar,
      }
    }
    default:
      // shares are never nested (backend contract)
      return null
  }
}

export function ShareDialog({
  open,
  onOpenChange,
  content,
  onShared,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  content: ShareContent | null
  onShared?: () => void
}) {
  const me = useAppStore((s) => s.me)
  const [caption, setCaption] = useState('')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const text = useMemo(() => (content ? composeShareText(content) : ''), [content])

  // Generate shareable link
  const shareLink = useMemo(() => {
    if (!content) return ''
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    return `${baseUrl}/post/${content.targetType.toLowerCase()}-${content.targetId}`
  }, [content])

  // fresh composer each time it opens (like Facebook)
  useEffect(() => {
    if (open) {
      setCaption('')
      setCopied(false)
      setLinkCopied(false)
    }
  }, [open])

  if (!content) return null

  const roleChip = content.authorRole ? (ROLE_CHIP[content.authorRole] ?? null) : null
  const roleLabel = content.authorRole ? (ROLE_LABEL[content.authorRole] ?? content.authorRole) : null

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Post copied — paste it anywhere', {
        description: 'The full post content is on your clipboard, ready to share.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy the post text')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      toast.success('Link copied!', {
        description: 'Share this link anywhere - the post will open directly.',
      })
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      toast.error('Could not copy the link')
    }
  }

  function shareToWhatsApp() {
    const shareText = `${content.title}\n\n${shareLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer')
  }

  function shareToFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`, '_blank', 'noopener,noreferrer')
  }

  function shareToTwitter() {
    const tweetText = `Check out this post on StudySir: ${content.title}`
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(tweetText)}`, '_blank', 'noopener,noreferrer')
  }

  function shareToLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`, '_blank', 'noopener,noreferrer')
  }

  function shareToTelegram() {
    const shareText = `${content.title}\n\n${shareLink}`
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer')
  }

  async function postToFeed() {
    if (!content || submitting) return
    setSubmitting(true)
    try {
      const d = await api.shareToFeed(content.targetType, content.targetId, caption.trim())
      toast.success('Shared to your feed', {
        description: d.notified ? 'The author was notified.' : 'Everyone on StudySir can see it now.',
      })
      onOpenChange(false)
      onShared?.()
    } catch (e) {
      toast.error('Could not share to feed', { description: errorMessage(e) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-[#1877F2]" />
            Share to feed
          </DialogTitle>
          <DialogDescription>Your share appears on the feed with the original post attached.</DialogDescription>
        </DialogHeader>

        {/* identity row */}
        <div className="flex items-center gap-2.5">
          <UserAvatar src={me?.avatar} name={me?.name ?? 'Guest'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{me?.name ?? 'Guest'}</p>
            <span className="mt-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              Anyone on StudySir 🌐
            </span>
          </div>
        </div>

        {/* caption — borderless like the FB composer */}
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something about this…"
          maxLength={2000}
          className="min-h-20 resize-none border-0 px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        />

        {/* embedded original post (static preview of what gets attached) */}
        <div className="overflow-hidden rounded-xl border bg-muted/40">
          <div className="flex items-center gap-2.5 p-3">
            <UserAvatar src={content.authorAvatar} name={content.authorName} className="size-9" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <p className="truncate text-sm font-bold leading-tight">{content.authorName}</p>
                {roleChip && roleLabel ? (
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', roleChip)}>{roleLabel}</span>
                ) : null}
              </div>
            </div>
          </div>
          {content.image ? <SafeImage src={content.image} alt={content.title} className="h-28 w-full object-cover" /> : null}
          <div className="space-y-1 p-3">
            {content.emoji ? <span className="text-sm">{content.emoji}</span> : null}
            <p className="text-sm font-bold leading-snug">{content.title}</p>
            {content.description ? (
              <p className="line-clamp-2 text-sm text-foreground/80">{content.description}</p>
            ) : null}
            {content.byline ? <p className="text-xs text-muted-foreground">{content.byline}</p> : null}
            {content.price ? <p className="text-sm font-semibold">{content.price}</p> : null}
          </div>
        </div>

        {/* Shareable link section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Share link (opens directly to this post)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {shareLink}
            </div>
            <Button variant="outline" size="sm" onClick={copyLink}>
              {linkCopied ? <Check className="mr-1.5 size-4 text-green-600" /> : <Copy className="mr-1.5 size-4" />}
              {linkCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* External sharing platforms */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Share on social media</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={shareToWhatsApp} className="gap-1.5">
              <MessageCircle className="size-4 text-green-600" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={shareToFacebook} className="gap-1.5">
              <Facebook className="size-4 text-blue-600" />
              Facebook
            </Button>
            <Button variant="outline" size="sm" onClick={shareToTwitter} className="gap-1.5">
              <Twitter className="size-4 text-sky-500" />
              Twitter
            </Button>
            <Button variant="outline" size="sm" onClick={shareToLinkedIn} className="gap-1.5">
              <Linkedin className="size-4 text-blue-700" />
              LinkedIn
            </Button>
            <Button variant="outline" size="sm" onClick={shareToTelegram} className="gap-1.5">
              <Send className="size-4 text-sky-500" />
              Telegram
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={() => void postToFeed()}
            disabled={submitting}
            className="w-full bg-[#1877F2] text-white hover:bg-[#166fe5]"
          >
            {submitting ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Share2 className="mr-1.5 size-4" />
            )}
            Share to StudySir Feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
