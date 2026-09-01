'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Ban,
  Bell,
  Info,
  Mail,
  MessageSquare,
  PartyPopper,
  Undo2,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { NotificationDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { EmptyState } from '../shared/EmptyState'
import { timeAgo } from '../shared/format'

/* Alpha-based icon chips so they stay readable on light AND dark surfaces. */
const NOTIF_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  CONNECT_REQUEST: { icon: MessageSquare, className: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400' },
  MESSAGE: { icon: Mail, className: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400' },
  HIRED: { icon: PartyPopper, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  REJECTED: { icon: XCircle, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  REFUND: { icon: Undo2, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  BLOCK: { icon: Ban, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  SYSTEM: { icon: Info, className: 'bg-muted text-muted-foreground' },
}

export function NotificationsPopover() {
  const notifCount = useAppStore((s) => s.notifCount)
  const setNotifCount = useAppStore((s) => s.setNotifCount)
  const go = useAppStore((s) => s.go)

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationDTO[] | null>(null)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.getNotifications()
      setItems(d.notifications)
      setNotifCount(d.unread)
    } catch {
      // ignore polling failures
    }
  }, [setNotifCount])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function markAllRead() {
    setMarking(true)
    try {
      await api.markNotificationsRead()
      setNotifCount(0)
      await load()
    } catch {
      // ignore
    } finally {
      setMarking(false)
    }
  }

  function openNotification(n: NotificationDTO) {
    setOpen(false)
    if (n.link === 'chats') go('chats')
    else if (n.link === 'wallet') go('wallet')
    else if (n.link === 'admin') go('admin')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${notifCount ? ` (${notifCount} unread)` : ''}`}
          className="relative grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-secondary"
        >
          <Bell className="size-5" />
          {notifCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="card-shadow w-[340px] p-0 sm:w-[380px]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-lg font-bold">Notifications</p>
          <button
            type="button"
            onClick={markAllRead}
            disabled={marking || (notifCount ?? 0) === 0}
            className="text-sm font-medium text-[#1877F2] transition-colors hover:underline disabled:opacity-50 disabled:hover:no-underline"
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items === null ? (
            <div className="space-y-3 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1.5 py-0.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={Bell} title="All caught up" hint="New requests, hires and refunds will show up here." />
          ) : (
            <div className="divide-y">
              {items.map((n) => {
                const style = NOTIF_STYLE[n.type] ?? NOTIF_STYLE.SYSTEM
                const Icon = style.icon
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn(
                      'flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted',
                      !n.read && 'bg-blue-500/10'
                    )}
                  >
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', style.className)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold">{n.title}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                      ) : null}
                    </span>
                    {!n.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1877F2]" /> : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
