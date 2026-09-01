'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ConnectionDTO } from '@/lib/types'
import { CONNECTION_CHIP, TUITION_STATUS } from './constants'
import { Stars } from './Stars'
import { UserAvatar } from './UserAvatar'
import { fullDate } from './format'

/** Facebook-style white card container. */
export function FbCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card-shadow rounded-xl bg-card', className)}>{children}</div>
}

export function CardSkeleton() {
  return (
    <FbCard className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <Skeleton className="mt-4 h-24 w-full rounded-lg" />
    </FbCard>
  )
}

/** "Languages: English, Urdu" style row with a small blue icon. */
export function DetailRow({
  icon: Icon,
  label,
  value,
  bold = false,
}: {
  icon: LucideIcon
  label: string
  value?: string | number | null
  bold?: boolean
}) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-[#1877F2]" />
      <span className="shrink-0 font-semibold">{label}:</span>
      <span className={cn('min-w-0 truncate', bold ? 'font-bold' : 'text-foreground/80')}>{value}</span>
    </div>
  )
}

/** Grid of card footer actions; count is dynamic so we set the columns inline. */
export function ActionGrid({ count, children, className }: { count: number; children: ReactNode; className?: string }) {
  const style: CSSProperties = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }
  return (
    <div className={cn('grid gap-1', className)} style={style}>
      {children}
    </div>
  )
}

export function CardAction({
  icon: Icon,
  label,
  active = false,
  primary = false,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  primary?: boolean
  danger?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="mx-auto h-8 rounded-md bg-[#1877F2] px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#166FE5] disabled:opacity-50"
      >
        {label}
      </button>
    )
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        '@container flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-1 text-sm font-semibold transition-colors',
        disabled
          ? 'cursor-default text-muted-foreground/70'
          : active
            ? 'text-[#1877F2] hover:bg-muted dark:text-blue-400'
            : danger
              ? 'text-red-600 hover:bg-red-500/10 dark:text-red-400'
              : 'text-muted-foreground hover:bg-muted'
      )}
    >
      <Icon
        className={cn(
          'size-[18px] shrink-0',
          active && !disabled && 'fill-[#1877F2] text-[#1877F2]'
        )}
      />
      <span className="hidden truncate @min-[76px]:inline">{label}</span>
    </button>
  )
}

export function StatText({ children }: { children: ReactNode }) {
  return <p className="px-1 pb-1 text-[13px] text-muted-foreground">{children}</p>
}

export function ConnectionStatusChip({ connection }: { connection: ConnectionDTO }) {
  const chip = CONNECTION_CHIP[connection.status]
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', chip.className)}>{chip.label}</span>
      {connection.refunded && (connection.status === 'EXPIRED' || connection.status === 'REJECTED') ? (
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
          {connection.status === 'EXPIRED' ? 'coins returned' : `${connection.coinsSpent} coins refunded`}
        </span>
      ) : null}
    </span>
  )
}

export function TuitionStatusBadge({ status }: { status: string }) {
  const chip = TUITION_STATUS[status]
  if (!chip) return null
  return <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', chip.className)}>{chip.label}</span>
}

export function ReviewRow({
  review,
}: {
  review: {
    id: string
    rating: number
    comment: string | null
    createdAt: string
    author: { id: string; name: string; avatar: string | null; headline?: string | null }
  }
}) {
  return (
    <div className="flex gap-3 border-b py-3 last:border-b-0">
      <UserAvatar src={review.author.avatar} name={review.author.name} className="size-9" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold">{review.author.name}</span>
          <Stars value={review.rating} />
        </div>
        {review.comment ? <p className="mt-0.5 text-sm text-foreground/90">{review.comment}</p> : null}
        <p className="mt-0.5 text-xs text-muted-foreground">{fullDate(review.createdAt)}</p>
      </div>
      <Star className="mt-1 size-4 shrink-0 fill-amber-400 text-amber-400" />
    </div>
  )
}
