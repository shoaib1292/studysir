'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  Coins,
  Copy,
  CornerUpRight,
  Flag,
  Forward,
  GraduationCap,
  Handshake,
  ImagePlus,
  Lock,
  MessageCircle,
  Search,
  SendHorizonal,
  Smile,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import { fileToCompactDataUrl } from '@/lib/image'
import type { ConnectionDTO, MessageDTO, MessageReactionGroup } from '@/lib/types'
import { emitTyping, getSocket, onEvent, offEvent, RT } from '@/lib/socket'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { CONNECTION_CHIP, CONNECTION_DOT } from '../shared/constants'
import { clockTime, dayLabel, lastSeenLabel, timeAgo } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'
import { UserAvatar } from '../shared/UserAvatar'

// ===== Chat list =====

function otherParty(connection: ConnectionDTO, meId: string) {
  return connection.student.id === meId ? connection.teacher : connection.student
}

function previewText(connection: ConnectionDTO, meId: string): { text: string; italic: boolean } {
  const lm = connection.lastMessage
  if (!lm) return { text: 'New connection request — say hi!', italic: false }
  const involvesMe = lm.senderId === meId
  const isParty = lm.senderId === connection.teacher.id || lm.senderId === connection.student.id
  if (!isParty) return { text: lm.content, italic: true } // system message
  return { text: involvesMe ? `You: ${lm.content}` : lm.content, italic: false }
}

function ConnectionRow({
  connection,
  meId,
  active,
  online,
  onSelect,
}: {
  connection: ConnectionDTO
  meId: string
  active: boolean
  online: boolean
  onSelect: () => void
}) {
  const other = otherParty(connection, meId)
  const preview = previewText(connection, meId)
  const chip = CONNECTION_CHIP[connection.status]
  const when = connection.lastMessage?.createdAt ?? connection.createdAt
  const hasUnread = connection.unreadCount > 0

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted',
        active && 'bg-blue-500/10 hover:bg-blue-500/10',
        hasUnread && !active && 'bg-blue-500/[0.04]'
      )}
    >
      {/* Messenger-style active indicator */}
      {active ? (
        <span aria-hidden className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#1877F2]" />
      ) : null}
      <div className="relative shrink-0">
        <UserAvatar src={other.avatar} name={other.name} className="size-12" />
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card',
            CONNECTION_DOT[connection.status]
          )}
        />
        {online ? (
          <span
            aria-label="Online now"
            title="Active now"
            className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-card bg-green-500"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn('min-w-0 flex-1 truncate text-[15px]', hasUnread ? 'font-extrabold' : 'font-semibold')}>
            {other.name}
          </p>
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold', chip.className)}>
            {chip.label}
          </span>
        </div>
        <p
          className={cn(
            'mt-0.5 truncate text-xs',
            hasUnread ? 'font-medium text-foreground/90' : 'text-muted-foreground',
            preview.italic && 'italic'
          )}
        >
          {preview.text}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(when)}</p>
      </div>

      {connection.unreadCount > 0 ? (
        <Badge className="mt-1 h-5 min-w-5 shrink-0 rounded-full bg-[#1877F2] px-1.5 text-[10px]">
          {connection.unreadCount > 9 ? '9+' : connection.unreadCount}
        </Badge>
      ) : null}
    </button>
  )
}

// ===== Chat thread =====

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="mx-auto w-fit max-w-[85%] rounded-full bg-foreground/10 px-3 py-1 text-center text-[11px] text-foreground/80">
      {content}
    </div>
  )
}

function DayChip({ label }: { label: string }) {
  return (
    <div className="my-2 flex w-fit mx-auto rounded-full bg-card px-3 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
      {label}
    </div>
  )
}

/** Messenger-style divider marking the first unseen message. */
function UnreadDivider({ count }: { count: number }) {
  return (
    <div className="my-2 flex items-center gap-2" role="separator" aria-label={`${count} new messages`}>
      <span className="h-px flex-1 bg-blue-500/30" />
      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-[#1877F2] dark:text-blue-400">
        {count} new {count === 1 ? 'message' : 'messages'}
      </span>
      <span className="h-px flex-1 bg-blue-500/30" />
    </div>
  )
}

const EMOJIS = [
  '😀', '😂', '🥰', '😊', '😎', '🤔', '😴', '😭',
  '😡', '🤩', '😅', '😇', '👍', '👎', '👏', '🙏',
  '💪', '🤝', '✌️', '👋', '🔥', '⭐', '❤️', '💚',
  '💙', '🎉', '🎓', '📚', '✏️', '📅', '⏰', '💰',
]

/** Facebook-style quick reactions (must match the API whitelist). */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👎'] as const

function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Insert emoji"
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Smile className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[248px] p-2">
        <p className="px-1 pb-1.5 text-[11px] font-semibold text-muted-foreground">Frequently used</p>
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`Insert ${e}`}
              onClick={() => onPick(e)}
              className="grid size-7 place-items-center rounded text-lg leading-none transition-transform hover:scale-125 hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy path (insecure context)
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function MessageBubble({
  message,
  mine,
  meId,
  canReact,
  onReact,
  onUnsend,
  onForward,
}: {
  message: MessageDTO
  mine: boolean
  meId: string
  canReact: boolean
  onReact: (messageId: string, emoji: string) => void
  /** present when the viewer may unsend (own, non-system, persisted message) */
  onUnsend?: (messageId: string) => void
  /** present when the viewer has other chats to forward into */
  onForward?: (message: MessageDTO) => void
}) {
  const [copied, setCopied] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const hasImage = Boolean(message.image)
  const hasText = Boolean(message.content) && message.content !== '📷 Photo'
  const hasReactions = message.reactions.length > 0
  const canUnsend = Boolean(onUnsend) && mine && !message.system && !message.deleted && !message.id.startsWith('tmp-')
  const canForward = Boolean(onForward) && !message.system && !message.deleted && !message.id.startsWith('tmp-')

  // Close the reaction picker on outside interaction (mouse, touch or pen)
  useEffect(() => {
    if (!pickerOpen) return
    const onDown = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [pickerOpen])

  async function onCopy() {
    const ok = await copyText(message.content)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } else {
      toast.error('Could not copy message')
    }
  }

  return (
    <div className={cn('flex animate-in flex-col fade-in slide-in-from-bottom-1 duration-200', mine ? 'items-end' : 'items-start')}>
      {/* Messenger-style unsent placeholder */}
      {message.deleted ? (
        <p className="rounded-full bg-muted px-3 py-1 text-xs italic text-muted-foreground">
          <Trash2 className="mr-1 inline size-3" aria-hidden />
          {mine ? 'You unsent a message' : `${message.sender.name} unsent a message`}
        </p>
      ) : (
        <>
      <div className={cn('group relative flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
        {/* Facebook-style quick-reaction bar (above the bubble) */}
        {canReact && pickerOpen ? (
          <div
            ref={pickerRef}
            role="menu"
            aria-label="Pick a reaction"
            className={cn(
              'absolute -top-3 z-20 flex -translate-y-full items-center gap-0.5 rounded-full border bg-card p-1 shadow-lg animate-in fade-in zoom-in-95 duration-150',
              mine ? 'right-7' : 'left-7'
            )}
          >
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`React with ${e}`}
                onClick={() => {
                  onReact(message.id, e)
                  setPickerOpen(false)
                }}
                className={cn(
                  'grid size-9 place-items-center rounded-full text-xl leading-none transition-transform duration-150 hover:z-10 hover:scale-[1.35] hover:bg-muted',
                  message.reactions.some((g) => g.emoji === e && g.userIds.includes(meId)) && 'bg-blue-500/10'
                )}
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}

        {!mine ? <UserAvatar src={message.sender.avatar} name={message.sender.name} className="mb-1 size-7" /> : null}
        {!mine ? (
          <button
            type="button"
            aria-label="Copy message"
            title="Copy"
            onClick={onCopy}
            className="mb-1.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100"
          >
            {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
          </button>
        ) : null}
        {!mine && canForward ? (
          <button
            type="button"
            aria-label="Forward message"
            title="Forward"
            onClick={() => onForward?.(message)}
            className="mb-1.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Forward className="size-3.5" />
          </button>
        ) : null}
        <div
          className={cn(
            'max-w-[78%] rounded-2xl px-3.5 py-2',
            mine ? 'rounded-br-md bg-[#1877F2] text-white' : 'rounded-bl-md bg-card shadow-sm',
            hasImage && 'p-1.5'
          )}
        >
          {hasImage ? (
            <>
              <img
                src={message.image!}
                alt={hasText ? message.content : `Photo from ${message.sender.name}`}
                onClick={() => setZoom(true)}
                className={cn(
                  'max-h-72 w-full max-w-[280px] cursor-zoom-in rounded-xl object-cover',
                  mine ? 'bg-[#166FE5]' : 'bg-muted'
                )}
              />
              {message.forwarded ? (
                <p className="flex items-center gap-1 px-2 pt-1.5 text-[10px] italic opacity-80">
                  <CornerUpRight className="size-3" aria-hidden />
                  Forwarded
                </p>
              ) : null}
              {hasText ? <p className="whitespace-pre-line break-words px-2 pb-1 pt-1.5 text-[15px]">{message.content}</p> : null}
            </>
          ) : (
            <>
              {message.forwarded ? (
                <p className="mb-0.5 flex items-center gap-1 text-[10px] italic opacity-80">
                  <CornerUpRight className="size-3" aria-hidden />
                  Forwarded
                </p>
              ) : null}
              <p className="whitespace-pre-line break-words text-[15px]">{message.content}</p>
            </>
          )}
          <div className={cn('flex items-center justify-end gap-1', hasImage && !hasText && 'px-1.5 pb-0.5')}>
            <span className="text-[10px] opacity-70">{clockTime(message.createdAt)}</span>
            {mine && !message.system ? (
              message.readAt ? (
                <CheckCheck className="size-3.5 text-blue-200" aria-label="Read" />
              ) : (
                <Check className="size-3.5 opacity-70" aria-label="Sent" />
              )
            ) : null}
          </div>
        </div>
        {mine ? (
          <button
            type="button"
            aria-label="Copy message"
            title="Copy"
            onClick={onCopy}
            className="mb-1.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100"
          >
            {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
          </button>
        ) : null}
        {mine && canForward ? (
          <button
            type="button"
            aria-label="Forward message"
            title="Forward"
            onClick={() => onForward?.(message)}
            className="mb-1.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Forward className="size-3.5" />
          </button>
        ) : null}
        {canUnsend ? (
          <button
            type="button"
            aria-label="Unsend message"
            title="Unsend"
            onClick={() => onUnsend?.(message.id)}
            className="mb-1.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
        {canReact ? (
          <button
            type="button"
            aria-label="React to message"
            aria-expanded={pickerOpen}
            title="React"
            onClick={() => setPickerOpen((o) => !o)}
            className={cn(
              'mb-1.5 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-all hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100',
              pickerOpen ? 'opacity-100' : 'opacity-0'
            )}
          >
            <SmilePlus className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* Reaction chips (Messenger-style, under the bubble) */}
      {hasReactions ? (
        <div className={cn('flex flex-wrap gap-1', mine ? 'pr-9' : 'pl-9', '-mt-1.5')}>
          {message.reactions.map((g) => {
            const isMine = g.userIds.includes(meId)
            return (
              <button
                key={g.emoji}
                type="button"
                aria-label={isMine ? `Remove ${g.emoji} reaction` : `React with ${g.emoji}`}
                title={isMine ? 'Tap to remove' : 'React too'}
                onClick={() => canReact && onReact(message.id, g.emoji)}
                className={cn(
                  'flex items-center gap-0.5 rounded-full border bg-card px-1.5 py-0.5 shadow-sm transition-all duration-150 hover:scale-110',
                  isMine ? 'border-[#1877F2] ring-1 ring-[#1877F2]/30' : 'border-border'
                )}
              >
                <span className="text-xs leading-none">{g.emoji}</span>
                {g.count > 1 ? <span className="text-[10px] font-semibold text-muted-foreground">{g.count}</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* Fullscreen lightbox */}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent
          className="max-h-[92dvh] border-none bg-black/90 p-2 sm:max-w-3xl [&>button]:bg-white/10 [&>button]:rounded-full"
          onClick={() => setZoom(false)}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Photo from {message.sender.name}</DialogTitle>
            <DialogDescription>Photo attachment in chat with {message.sender.name}</DialogDescription>
          </DialogHeader>
          <img
            src={message.image!}
            alt={hasText ? message.content : `Photo from ${message.sender.name}`}
            className="max-h-[85dvh] w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}

function TypingBubble({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200" aria-live="polite">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-card px-3.5 py-2.5 shadow-sm">
        <span className="sr-only">{name} is typing</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

type ThreadDialog = 'hire' | 'reject' | 'block' | 'report' | null

/** Messenger-style "Forward to…" dialog: pick one of your other chats. */
function ForwardDialog({
  message,
  onClose,
}: {
  message: MessageDTO | null
  onClose: () => void
}) {
  const [connections, setConnections] = useState<ConnectionDTO[] | null>(null)
  const [search, setSearch] = useState('')
  const [forwardingTo, setForwardingTo] = useState<string | null>(null)

  useEffect(() => {
    if (!message) {
      const t = setTimeout(() => {
        setSearch('')
        setForwardingTo(null)
      }, 0)
      return () => clearTimeout(t)
    }
    let cancelled = false
    const t = setTimeout(() => {
      setConnections(null)
      api
        .getConnections()
        .then((d) => {
          if (!cancelled) setConnections(d.connections)
        })
        .catch(() => {
          if (!cancelled) setConnections([])
        })
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [message])

  const targets = useMemo(() => {
    if (!connections || !message) return []
    const q = search.trim().toLowerCase()
    return connections
      .filter((c) => c.id !== message.connectionId)
      .sort((a, b) => {
        const ta = new Date(a.lastMessage?.createdAt ?? a.createdAt).getTime()
        const tb = new Date(b.lastMessage?.createdAt ?? b.createdAt).getTime()
        return tb - ta
      })
      .map((c) => ({ c, name: otherParty(c, message.senderId).name }))
      .filter((t) => !q || t.name.toLowerCase().includes(q))
  }, [connections, message, search])

  async function forward(c: ConnectionDTO) {
    if (!message || forwardingTo) return
    const other = otherParty(c, message.senderId)
    setForwardingTo(c.id)
    try {
      await api.forwardMessage(message.id, c.id)
      toast.success(`Forwarded to ${other.name}`)
      onClose()
    } catch (err) {
      toast.error('Could not forward', { description: errorMessage(err) })
      setForwardingTo(null)
    }
  }

  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Forward to…</DialogTitle>
          <DialogDescription>
            {message?.image && !message?.content
              ? 'Send this photo to another chat'
              : `Send “${(message?.content ?? '').slice(0, 60)}${(message?.content ?? '').length > 60 ? '…' : ''}” to another chat`}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="h-9 rounded-full bg-muted pl-9"
              aria-label="Search chats to forward to"
            />
          </div>
        </div>
        <div className="max-h-[46dvh] min-h-[120px] overflow-y-auto border-t" aria-label="Your chats">
          {connections === null ? (
            <div className="space-y-3 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : targets.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {search ? 'No chats match your search.' : 'No other chats yet — start one from the feed first.'}
            </p>
          ) : (
            targets.map(({ c, name }) => {
              const locked = ['HIRED', 'REJECTED', 'EXPIRED'].includes(c.status) || !!c.blockedBy
              const busy = forwardingTo === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-disabled={locked || busy}
                  disabled={locked || !!forwardingTo}
                  title={locked ? 'That conversation is locked' : `Forward to ${name}`}
                  onClick={() => void forward(c)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    locked ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted',
                    busy && 'bg-blue-500/10'
                  )}
                >
                  <UserAvatar src={otherParty(c, message!.senderId).avatar} name={name} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{name}</span>
                    <span className="block text-[11px] text-muted-foreground">{CONNECTION_CHIP[c.status].label}</span>
                  </span>
                  {locked ? (
                    <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Locked chat" />
                  ) : busy ? (
                    <span
                      className="size-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-[#1877F2]"
                      aria-label="Forwarding"
                    />
                  ) : (
                    <Forward className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChatThread({
  connectionId,
  onListChanged,
}: {
  connectionId: string
  onListChanged: () => void
}) {
  const me = useAppStore((s) => s.me)!
  const back = useAppStore((s) => s.back)
  const refreshMe = useAppStore((s) => s.refreshMe)

  const [data, setData] = useState<{ connection: ConnectionDTO; messages: MessageDTO[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<ThreadDialog>(null)
  const [reportReason, setReportReason] = useState('')
  const [typingName, setTypingName] = useState<string | null>(null)
  const [showJump, setShowJump] = useState(false)
  /** message id awaiting "Unsend" confirmation */
  const [pendingUnsend, setPendingUnsend] = useState<string | null>(null)
  const [unsending, setUnsending] = useState(false)
  /** message awaiting "Forward to…" chat picker */
  const [pendingForward, setPendingForward] = useState<MessageDTO | null>(null)
  /** incoming messages that arrived while the thread was scrolled up (jump pill) */
  const [newBelow, setNewBelow] = useState(0)
  /** snapshot of unseen messages when the thread was first opened (drives the "new" divider) */
  const [unreadInfo, setUnreadInfo] = useState<{ count: number; firstId: string | null } | null>(null)
  const unreadCaptured = useRef(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSent = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** true while the user keeps the thread scrolled to the newest message */
  const atBottomRef = useRef(true)
  const onlineIds = useAppStore((s) => s.onlineIds)

  const load = useCallback(async () => {
    try {
      const d = await api.getConnection(connectionId)
      setData(d)
      if (!unreadCaptured.current) {
        unreadCaptured.current = true
        setUnreadInfo(d.unread)
      }
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [connectionId])

  // New thread → capture a fresh unread snapshot + reset scroll/jump state
  useEffect(() => {
    unreadCaptured.current = false
    setUnreadInfo(null)
    setNewBelow(0)
    atBottomRef.current = true
  }, [connectionId])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime: live messages, status changes, read receipts + typing indicator.
  // A slow interval poll stays as a safety net for missed events.
  useEffect(() => {
    // ensure socket identity, then subscribe
    getSocket(me.id, me.name)

    const onMessage = (p: { connectionId?: string; message?: MessageDTO }) => {
      if (!p || p.connectionId !== connectionId) return
      if (p.message && p.message.senderId === me.id) return // own messages handled by send flow
      // If the user is scrolled up reading history, count it for the jump pill
      if (!atBottomRef.current) setNewBelow((n) => n + 1)
      void load()
    }
    const onUpdated = (p: { connectionId?: string }) => {
      if (!p || p.connectionId !== connectionId) return
      void load()
      onListChanged()
    }
    const onRead = (p: { connectionId?: string }) => {
      if (!p || p.connectionId !== connectionId) return
      setData((d) =>
        d
          ? {
              ...d,
              messages: d.messages.map((m) =>
                m.senderId === me.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m
              ),
            }
          : d
      )
    }
    const onReaction = (p: { connectionId?: string; messageId?: string; reactions?: MessageReactionGroup[] }) => {
      if (!p || p.connectionId !== connectionId || !p.messageId) return
      setData((d) =>
        d
          ? {
              ...d,
              messages: d.messages.map((m) =>
                m.id === p.messageId ? { ...m, reactions: p.reactions ?? [] } : m
              ),
            }
          : d
      )
    }
    const onDelete = (p: { connectionId?: string; messageId?: string }) => {
      if (!p || p.connectionId !== connectionId || !p.messageId) return
      setData((d) =>
        d
          ? {
              ...d,
              messages: d.messages.map((m) =>
                m.id === p.messageId ? { ...m, deleted: true, content: '', image: null } : m
              ),
            }
          : d
      )
    }
    const onTyping = (p: { connectionId?: string; userId?: string; name?: string; isTyping?: boolean }) => {
      if (!p || p.connectionId !== connectionId || p.userId === me.id) return
      if (typingTimer.current) clearTimeout(typingTimer.current)
      if (p.isTyping) {
        setTypingName(p.name || 'Someone')
        typingTimer.current = setTimeout(() => setTypingName(null), 3000)
      } else {
        setTypingName(null)
      }
    }

    onEvent(RT.chatMessage, onMessage)
    onEvent(RT.chatUpdated, onUpdated)
    onEvent(RT.chatRead, onRead)
    onEvent(RT.chatReaction, onReaction)
    onEvent(RT.chatDelete, onDelete)
    onEvent('typing', onTyping)

    const timer = setInterval(() => void load(), 15000)
    return () => {
      clearInterval(timer)
      offEvent(RT.chatMessage, onMessage)
      offEvent(RT.chatUpdated, onUpdated)
      offEvent(RT.chatRead, onRead)
      offEvent(RT.chatReaction, onReaction)
      offEvent(RT.chatDelete, onDelete)
      offEvent('typing', onTyping)
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [connectionId, load, onListChanged, me.id, me.name])

  // Auto-scroll to the newest message while the user stays at the bottom
  // (also when the typing indicator appears). Reading history is never interrupted.
  const messageCount = data?.messages.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messageCount, connectionId, typingName])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distance < 80
    setShowJump(distance > 240)
    if (distance <= 240 && newBelow > 0) setNewBelow(0)
  }

  function jumpToLatest() {
    setNewBelow(0)
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }

  const connection = data?.connection
  const other = connection ? otherParty(connection, me.id) : null
  const otherOnline = !!other && onlineIds.includes(other.id)

  const blocked = !!connection?.blockedBy
  const iBlocked = connection?.blockedBy === me.id
  const decided = !!connection && ['HIRED', 'REJECTED', 'EXPIRED'].includes(connection.status)
  const isPostOwner = connection?.student.id === me.id
  const showActions = !!connection && !blocked && !decided

  function handleDraftChange(value: string) {
    setDraft(value)
    if (!connection || !other) return
    const now = Date.now()
    if (value.trim() && now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now
      emitTyping(other.id, connectionId, true)
    } else if (!value.trim() && lastTypingSent.current) {
      lastTypingSent.current = 0
      emitTyping(other.id, connectionId, false)
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || !connection || sending) return
    setSending(true)
    setDraft('')
    const optimistic: MessageDTO = {
      id: `tmp-${Date.now()}`,
      connectionId: connection.id,
      senderId: me.id,
      sender: { id: me.id, name: me.name, avatar: me.avatar },
      content,
      image: null,
      system: false,
      forwarded: false,
      createdAt: new Date().toISOString(),
      readAt: null,
      deleted: false,
      reactions: [],
    }
    setData((d) => (d ? { ...d, messages: [...d.messages, optimistic] } : d))
    if (connection && other) emitTyping(other.id, connection.id, false)
    try {
      await api.sendMessage(connection.id, { content })
      await load()
    } catch (err) {
      setData((d) => (d ? { ...d, messages: d.messages.filter((m) => m.id !== optimistic.id) } : d))
      setDraft(content)
      toast.error('Message not sent', { description: errorMessage(err) })
    } finally {
      setSending(false)
    }
  }

  async function sendImage(file: File) {
    if (!connection || sending) return
    setSending(true)
    const optimisticId = `tmp-${Date.now()}`
    try {
      const image = await fileToCompactDataUrl(file)
      // optimistic bubble with the local preview
      const optimistic: MessageDTO = {
        id: optimisticId,
        connectionId: connection.id,
        senderId: me.id,
        sender: { id: me.id, name: me.name, avatar: me.avatar },
        content: '',
        image,
        system: false,
        forwarded: false,
        createdAt: new Date().toISOString(),
        readAt: null,
        deleted: false,
        reactions: [],
      }
      setData((d) => (d ? { ...d, messages: [...d.messages, optimistic] } : d))
      if (other) emitTyping(other.id, connection.id, false)
      await api.sendMessage(connection.id, { image })
      await load()
    } catch (err) {
      setData((d) => (d ? { ...d, messages: d.messages.filter((m) => m.id !== optimisticId) } : d))
      toast.error('Photo not sent', { description: errorMessage(err) })
    } finally {
      setSending(false)
    }
  }

  /** Toggle a Facebook-style reaction on a message (server returns the fresh snapshot). */
  async function react(messageId: string, emoji: string) {
    if (messageId.startsWith('tmp-')) return // optimistic bubbles: wait for the real send
    try {
      const res = await api.reactMessage(messageId, emoji)
      setData((d) =>
        d
          ? {
              ...d,
              messages: d.messages.map((m) => (m.id === messageId ? { ...m, reactions: res.reactions } : m)),
            }
          : d
      )
    } catch (err) {
      toast.error('Reaction failed', { description: errorMessage(err) })
    }
  }

  /** Messenger-style unsend: optimistic placeholder, server soft-delete, realtime to the other side. */
  async function unsend(messageId: string) {
    if (!data || unsending) return
    const snapshot = data.messages
    setUnsending(true)
    setPendingUnsend(null)
    setData((d) =>
      d
        ? {
            ...d,
            messages: d.messages.map((m) =>
              m.id === messageId ? { ...m, deleted: true, content: '', image: null, reactions: [] } : m
            ),
          }
        : d
    )
    try {
      await api.deleteMessage(messageId)
      onListChanged()
    } catch (err) {
      setData((d) => (d ? { ...d, messages: snapshot } : d))
      toast.error('Could not unsend', { description: errorMessage(err) })
    } finally {
      setUnsending(false)
    }
  }

  async function decide(action: 'HIRE' | 'REJECT' | 'BLOCK' | 'REPORT', reason?: string) {
    if (!connection || busy) return
    setBusy(true)
    try {
      const res = await api.decide(connection.id, action, reason)
      setData((d) => (d ? { ...d, connection: res.connection } : d))
      await refreshMe()
      if (action === 'HIRE') {
        toast.success('Teacher hired! 🎉', { description: 'Conversation is now locked.' })
      } else if (action === 'REJECT') {
        toast.success(
          'Request rejected',
          res.connection.refunded
            ? { description: `${res.connection.coinsSpent} coins refunded to the teacher.` }
            : { description: 'No coins were refunded — chat had already started.' }
        )
      } else if (action === 'BLOCK') {
        toast.success('User blocked')
      } else if (action === 'REPORT') {
        toast.success('Report submitted', { description: 'Our team will review it. Thank you.' })
      }
      setDialog(null)
      setReportReason('')
      onListChanged()
    } catch (err) {
      toast.error('Action failed', { description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  async function unblock() {
    if (!connection || busy) return
    setBusy(true)
    try {
      await api.decide(connection.id, 'UNBLOCK')
      toast.success('User unblocked', { description: 'You can chat again.' })
      await load()
      onListChanged()
    } catch (err) {
      toast.error('Could not unblock', { description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  // Build message nodes with system rows + day chips + unread divider
  const messageNodes: ReactNode[] = []
  if (data) {
    let prevDay = ''
    let dividerPlaced = false
    for (const m of data.messages) {
      const day = dayLabel(m.createdAt)
      if (day !== prevDay) {
        messageNodes.push(<DayChip key={`day-${m.id}`} label={day} />)
        prevDay = day
      }
      if (!dividerPlaced && unreadInfo?.firstId && m.id === unreadInfo.firstId) {
        messageNodes.push(<UnreadDivider key={`unread-${m.id}`} count={unreadInfo.count} />)
        dividerPlaced = true
      }
      if (m.system) messageNodes.push(<SystemMessage key={m.id} content={m.content} />)
      else
        messageNodes.push(
          <MessageBubble
            key={m.id}
            message={m}
            mine={m.senderId === me.id}
            meId={me.id}
            canReact={!blocked}
            onReact={(id, emoji) => void react(id, emoji)}
            onUnsend={m.senderId === me.id && !m.deleted ? (id) => setPendingUnsend(id) : undefined}
            onForward={!m.deleted && !m.system ? (msg) => setPendingForward(msg) : undefined}
          />
        )
    }
  }

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center">
        <EmptyState icon={MessageCircle} title="Chat not found" hint="It may have been removed." />
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Blue header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#1877F2] to-[#0C63D8] p-3 text-white">
        <button
          type="button"
          onClick={back}
          aria-label="Back to chats"
          className="rounded-full p-1.5 transition-colors hover:bg-white/15 lg:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>
        {other ? (
          <>
            <UserAvatar src={other.avatar} name={other.name} className="size-10 ring-2 ring-white/40" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold leading-tight">{other.name}</p>
              <p className="truncate text-[11px] opacity-90">
                {typingName ? (
                  <span className="italic">typing…</span>
                ) : otherOnline ? (
                  <span className="flex items-center gap-1">
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-green-400" />
                    Active now
                  </span>
                ) : (
                  lastSeenLabel(connection?.lastMessage?.createdAt ?? connection?.createdAt ?? null)
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {connection?.tuitionPost ? (
                <span className="hidden max-w-[180px] items-center gap-1 truncate rounded-full bg-white/15 px-2 py-0.5 text-[11px] sm:flex">
                  <GraduationCap className="size-3 shrink-0" />
                  <span className="truncate">{connection.tuitionPost.title}</span>
                </span>
              ) : null}
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                <Coins className="size-3" />
                {connection?.coinsSpent ?? 0} spent
              </span>
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={handleScroll} className="absolute inset-0 space-y-1.5 overflow-y-auto bg-background p-4">
        {data === null ? (
          <div className="space-y-3">
            <Skeleton className="mx-auto h-5 w-24 rounded-full bg-card" />
            <Skeleton className="h-12 w-2/3 rounded-2xl bg-card" />
            <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl bg-card/60" />
            <Skeleton className="h-12 w-2/3 rounded-2xl bg-card" />
          </div>
        ) : data.messages.length === 0 && !typingName ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-full bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              Say hi 👋 — messages appear here
            </p>
          </div>
        ) : (
          <>
            {messageNodes}
            {typingName ? (
              <div className="pt-1">
                <TypingBubble name={typingName} />
              </div>
            ) : null}
          </>
        )}
        </div>
        {showJump ? (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label={newBelow > 0 ? `${newBelow} new messages — scroll to latest` : 'Scroll to latest messages'}
            className="absolute bottom-3 right-3 flex animate-in fade-in zoom-in-50 items-center gap-1.5 rounded-full border bg-card py-1.5 pl-2.5 pr-1.5 text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground duration-150"
          >
            <ArrowDown className="size-4" />
            {newBelow > 0 ? (
              <span className="max-w-[110px] truncate rounded-full bg-[#1877F2] px-2 py-0.5 text-[10px] font-bold text-white">
                {newBelow} new
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      {/* Bottom: banner / input / decision actions */}
      <div className="border-t bg-card">
        {blocked ? (
          <div className="p-3">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <span>{iBlocked ? '🚫 You blocked this user. Unblock to chat again.' : '🚫 You are blocked by this user.'}</span>
              {iBlocked ? (
                <Button size="sm" variant="outline" onClick={unblock} disabled={busy}>
                  Unblock
                </Button>
              ) : null}
            </div>
          </div>
        ) : connection?.status === 'HIRED' ? (
          <div className="p-3">
            <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              🎉 Hire confirmed. Conversation is locked.
              {connection.coinsSpent > 0 ? ` ${connection.coinsSpent} coins keep the platform running.` : ''}
            </div>
          </div>
        ) : connection?.status === 'REJECTED' ? (
          <div className="p-3">
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              Request rejected. Conversation closed.{' '}
              {connection.refunded
                ? `${connection.coinsSpent} coins refunded to teacher.`
                : 'Coins are not refunded after chat.'}
            </div>
          </div>
        ) : connection?.status === 'EXPIRED' ? (
          <div className="p-3">
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              No reply within 10 days — coins auto-returned to teacher.
            </div>
          </div>
        ) : (
          <form onSubmit={send} className="flex items-center gap-2 p-3">
            <EmojiPicker
              onPick={(emoji) => {
                setDraft((d) => d + emoji)
                inputRef.current?.focus()
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Attach a photo"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void sendImage(file)
              }}
            />
            <button
              type="button"
              aria-label="Attach a photo"
              title="Send a photo"
              disabled={sending}
              onClick={() => fileInputRef.current?.click()}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <ImagePlus className="size-5" />
            </button>
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onPaste={(e) => {
                // Paste-to-send: images on the clipboard go straight out as a photo message
                const items = Array.from(e.clipboardData?.items ?? [])
                const imgItem = items.find((it) => it.type.startsWith('image/'))
                if (imgItem) {
                  const file = imgItem.getAsFile()
                  if (file) {
                    e.preventDefault()
                    void sendImage(file)
                  }
                }
              }}
              placeholder="Write your message"
              className="rounded-full bg-muted"
              aria-label="Write your message"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#1877F2] hover:bg-blue-500/10 dark:text-blue-400"
            >
              <SendHorizonal className="size-5" />
            </Button>
          </form>
        )}

        {showActions ? (
          <div className={cn('grid gap-2 px-3 pb-3', isPostOwner ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
            {isPostOwner ? (
              <>
                <Button
                  className="h-9 w-full rounded-lg bg-[#1877F2] text-sm font-bold text-white hover:bg-[#166FE5]"
                  onClick={() => setDialog('hire')}
                >
                  <Handshake className="size-4" />
                  Hire Teacher
                </Button>
                <Button
                  className="h-9 w-full rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700"
                  onClick={() => setDialog('reject')}
                >
                  <X className="size-4" />
                  Reject
                </Button>
              </>
            ) : null}
            <Button
              className="h-9 w-full rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700"
              onClick={() => setDialog('block')}
            >
              <Ban className="size-4" />
              Block
            </Button>
            <Button
              className="h-9 w-full rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700"
              onClick={() => setDialog('report')}
            >
              <Flag className="size-4" />
              Report
            </Button>
          </div>
        ) : null}
      </div>

      {/* Decision dialogs */}
      <ConfirmDialog
        open={dialog === 'hire'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Hire this teacher?"
        message="Chat will be locked after hire."
        confirmLabel="Confirm Hire"
        loading={busy}
        onConfirm={() => decide('HIRE')}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Reject this request?"
        message={
          connection && !connection.chatStartedAt && !connection.refunded
            ? `No chat started yet — the teacher's ${connection.coinsSpent} coins will be REFUNDED.`
            : 'Chat already started — NO coins will be refunded.'
        }
        confirmLabel="Reject"
        danger
        loading={busy}
        onConfirm={() => decide('REJECT')}
      />
      <ConfirmDialog
        open={dialog === 'block'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Block this user?"
        message="They will no longer be able to contact you. You can unblock later from Settings."
        confirmLabel="Block"
        danger
        loading={busy}
        onConfirm={() => decide('BLOCK')}
      />
      <ConfirmDialog
        open={dialog === 'report'}
        onOpenChange={(o) => {
          if (!o) {
            setReportReason('')
            setDialog(null)
          }
        }}
        title="Report this user?"
        message="Tell us what went wrong — our team will review the conversation."
        confirmLabel="Submit Report"
        danger
        loading={busy}
        onConfirm={() => decide('REPORT', reportReason.trim() || undefined)}
      >
        <Textarea
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder="Reason for reporting (optional)"
          rows={3}
          maxLength={500}
          className="mb-2"
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={!!pendingUnsend}
        onOpenChange={(o) => !o && setPendingUnsend(null)}
        title="Unsend this message?"
        message="It will be replaced with an “unsent” placeholder for everyone in the chat. This cannot be undone."
        confirmLabel="Unsend"
        danger
        loading={unsending}
        onConfirm={() => pendingUnsend && void unsend(pendingUnsend)}
      />
      <ForwardDialog message={pendingForward} onClose={() => setPendingForward(null)} />
    </div>
  )
}

// ===== View =====

export function ChatsView() {
  const me = useAppStore((s) => s.me)!
  const params = useAppStore((s) => s.params)
  const go = useAppStore((s) => s.go)
  const onlineIds = useAppStore((s) => s.onlineIds)

  const [connections, setConnections] = useState<ConnectionDTO[] | null>(null)
  const [search, setSearch] = useState('')

  const loadList = useCallback(async () => {
    try {
      const d = await api.getConnections()
      setConnections(d.connections)
    } catch {
      // keep previous list on failure
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList()
  }, [loadList])

  // Realtime: refresh the list when chats change (new message/status) + slow fallback poll
  useEffect(() => {
    getSocket(me.id, me.name)

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void loadList(), 250)
    }
    const onMessage = (p: { connectionId?: string }) => {
      if (p?.connectionId) scheduleRefresh()
    }
    const onUpdated = (p: { connectionId?: string }) => {
      if (p?.connectionId) scheduleRefresh()
    }

    onEvent(RT.chatMessage, onMessage)
    onEvent(RT.chatUpdated, onUpdated)
    const poll = setInterval(() => void loadList(), 15000)
    return () => {
      if (timer) clearTimeout(timer)
      offEvent(RT.chatMessage, onMessage)
      offEvent(RT.chatUpdated, onUpdated)
      clearInterval(poll)
    }
  }, [loadList, me.id, me.name])

  const sorted = useMemo(() => {
    if (!connections) return null
    return [...connections].sort((a, b) => {
      const ta = new Date(a.lastMessage?.createdAt ?? a.createdAt).getTime()
      const tb = new Date(b.lastMessage?.createdAt ?? b.createdAt).getTime()
      return tb - ta
    })
  }, [connections])

  const filtered = useMemo(() => {
    if (!sorted) return null
    const q = search.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((c) => otherParty(c, me.id).name.toLowerCase().includes(q))
  }, [sorted, search, me.id])

  const activeId = params.connectionId

  return (
    <div className="mx-auto card-shadow flex h-[calc(100vh-260px)] min-h-[440px] w-full max-w-[1100px] overflow-hidden rounded-xl border bg-card">
      {/* List pane */}
      <div className={cn('w-full flex-col lg:flex lg:w-[340px] lg:shrink-0 lg:border-r', activeId ? 'hidden' : 'flex')}>
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-bold">Chats</h1>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="h-9 rounded-full bg-muted pl-9"
            />
          </div>
        </div>

        <div className="flex-1 divide-y overflow-y-auto">
          {filtered === null ? (
            <div className="space-y-3 p-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageCircle}
                title="No chats yet"
                hint="Contact a teacher from the feed (costs coins)"
              />
            </div>
          ) : (
            filtered.map((c) => {
              const other = otherParty(c, me.id)
              return (
                <ConnectionRow
                  key={c.id}
                  connection={c}
                  meId={me.id}
                  active={c.id === activeId}
                  online={onlineIds.includes(other.id)}
                  onSelect={() => go('chats', { connectionId: c.id })}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Thread pane */}
      <div className={cn('min-w-0 flex-1', activeId ? 'flex' : 'hidden lg:flex')}>
        {activeId ? (
          <ChatThread connectionId={activeId} onListChanged={loadList} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center">
            <div className="card-shadow grid size-16 place-items-center rounded-full bg-card">
              <MessageCircle className="size-8 text-[#1877F2]" />
            </div>
            <p className="font-semibold">Your messages</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Pick a chat from the list — or contact a teacher from the feed to start one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
