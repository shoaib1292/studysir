'use client'

// Facebook-style sharing (requirement M): the POST CONTENT itself is shared —
// title + details + description as rich text — never a bare website link.
// Uses the native share sheet when available; falls back to a copy-text dialog
// with a live preview of exactly what gets shared.
import { useMemo, useState } from 'react'
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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

export function ShareDialog({
  open,
  onOpenChange,
  content,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  content: ShareContent | null
}) {
  const [copied, setCopied] = useState(false)
  const text = useMemo(() => (content ? composeShareText(content) : ''), [content])

  if (!content) return null

  async function nativeShare() {
    const nav = navigator as Navigator & { share?: (data: { title?: string; text: string }) => Promise<void> }
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: content!.title, text })
        onOpenChange(false)
        return true
      } catch {
        return false // user cancelled or share failed — fall through to copy
      }
    }
    return false
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Post copied — paste it anywhere', {
        description: 'The full post content is on your clipboard, ready to share.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — long-press the text below to copy manually')
    }
  }

  async function shareOrCopy() {
    const shared = await nativeShare()
    if (!shared) await copyText()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-[#1877F2]" />
            Share this post
          </DialogTitle>
          <DialogDescription>The post content is shared — not just a link.</DialogDescription>
        </DialogHeader>

        {/* live preview of the shared text */}
        <div className="max-h-64 overflow-y-auto rounded-xl border bg-muted/50 p-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{text}</pre>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => void copyText()}>
            {copied ? <Check className="mr-1.5 size-4 text-green-600" /> : <Copy className="mr-1.5 size-4" />}
            {copied ? 'Copied!' : 'Copy text'}
          </Button>
          <Button
            onClick={() => void shareOrCopy()}
            className={cn('bg-[#1877F2] hover:bg-[#166fe5]', 'text-white')}
          >
            <MessageCircle className="mr-1.5 size-4" />
            Share post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
