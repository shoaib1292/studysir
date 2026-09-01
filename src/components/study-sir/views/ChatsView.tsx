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
  Flag,
  GraduationCap,
  Handshake,
  MessageCircle,
  Search,
  SendHorizonal,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import type { ConnectionDTO, MessageDTO } from '@/lib/types'
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
        'flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted',
        active && 'bg-blue-500/10 hover:bg-blue-500/10',
        hasUnread && !active && 'bg-blue-500/[0.04]'
      )}
    >
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

function MessageBubble({ message, mine }: { message: MessageDTO; mine: boolean }) {
  return (
    <div className={cn('flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200', mine ? 'justify-end' : 'justify-start')}>
      {!mine ? <UserAvatar src={message.sender.avatar} name={message.sender.name} className="mb-1 size-7" /> : null}
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2',
          mine ? 'rounded-br-md bg-[#1877F2] text-white' : 'rounded-bl-md bg-card shadow-sm'
        )}
      >
        <p className="whitespace-pre-line break-words text-[15px]">{message.content}</p>
        <div className="mt-0.5 flex items-center justify-end gap-1">
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
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSent = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const onlineIds = useAppStore((s) => s.onlineIds)

  const load = useCallback(async () => {
    try {
      const d = await api.getConnection(connectionId)
      setData(d)
      setFailed(false)
    } catch {
      setFailed(true)
    }
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
    onEvent('typing', onTyping)

    const timer = setInterval(() => void load(), 15000)
    return () => {
      clearInterval(timer)
      offEvent(RT.chatMessage, onMessage)
      offEvent(RT.chatUpdated, onUpdated)
      offEvent(RT.chatRead, onRead)
      offEvent('typing', onTyping)
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [connectionId, load, onListChanged, me.id, me.name])

  // Auto-scroll to the newest message (also when typing indicator appears)
  const messageCount = data?.messages.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messageCount, connectionId, typingName])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowJump(distance > 240)
  }

  function jumpToLatest() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }

  const connection = data?.connection
  const other = connection ? otherParty(connection, me.id) : null
  const otherOnline = !!other && onlineIds.includes(other.id)

  const blocked = !!connection?.blockedBy
  const iBlocked = connection?.blockedBy === me.id
  const decided = !!connection && ['HIRED', 'REJECTED', 'EXPIRED'].includes(connection.status)
  const isPostOwner = connection?.student.id === me.id ?? false
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
      system: false,
      createdAt: new Date().toISOString(),
    }
    setData((d) => (d ? { ...d, messages: [...d.messages, optimistic] } : d))
    if (connection && other) emitTyping(other.id, connection.id, false)
    try {
      await api.sendMessage(connection.id, content)
      await load()
    } catch (err) {
      setData((d) => (d ? { ...d, messages: d.messages.filter((m) => m.id !== optimistic.id) } : d))
      setDraft(content)
      toast.error('Message not sent', { description: errorMessage(err) })
    } finally {
      setSending(false)
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

  // Build message nodes with system rows + day chips
  const messageNodes: ReactNode[] = []
  if (data) {
    let prevDay = ''
    for (const m of data.messages) {
      const day = dayLabel(m.createdAt)
      if (day !== prevDay) {
        messageNodes.push(<DayChip key={`day-${m.id}`} label={day} />)
        prevDay = day
      }
      if (m.system) messageNodes.push(<SystemMessage key={m.id} content={m.content} />)
      else messageNodes.push(<MessageBubble key={m.id} message={m} mine={m.senderId === me.id} />)
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
            aria-label="Scroll to latest messages"
            className="absolute bottom-3 right-3 grid size-9 animate-in fade-in zoom-in-50 place-items-center rounded-full border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground duration-150"
          >
            <ArrowDown className="size-4" />
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
          <form onSubmit={send} className="flex gap-2 p-3">
            <Input
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
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
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted p-6 text-center">
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
