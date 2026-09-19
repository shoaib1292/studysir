'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { UserAvatar } from '../../shared/UserAvatar'
import { EmptyState } from '../../shared/EmptyState'
import { timeAgo } from '../../shared/format'

type Filter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
]

const TARGET_LABEL: Record<string, string> = {
  TUITION: 'Tuition post',
  COURSE: 'Course',
  GOOD: 'Digital good',
  SHARED: 'Shared post',
  MESSAGE: 'Chat message',
}

const REASON_META: Record<string, { label: string; icon: typeof Link2; chip: string }> = {
  CONTACT_INFO: { label: 'Contact info blocked', icon: Phone, chip: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  UNAPPROVED_LINK: { label: 'Link needs review', icon: Link2, chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
}

const STATUS_CHIP: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  APPROVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

type ModerationItem = Awaited<ReturnType<typeof api.adminModeration>>['items'][number]

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border bg-card p-3">
      <span className={cn('text-lg font-extrabold tabular-nums', tone)}>{value}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function ReasonChip({ reason }: { reason: string }) {
  const meta = REASON_META[reason] ?? { label: reason, icon: AlertTriangle, chip: 'bg-muted text-muted-foreground' }
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', meta.chip)}>
      <Icon className="size-3" />
      {meta.label}
    </span>
  )
}

function ActionPopover({
  action,
  busy,
  onConfirm,
}: {
  action: 'APPROVE' | 'REJECT'
  busy: boolean
  onConfirm: (note: string) => void
}) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const isApprove = action === 'APPROVE'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={isApprove ? 'default' : 'destructive'}
          disabled={busy}
          className="gap-1.5"
        >
          {isApprove ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          {isApprove ? 'Approve' : 'Reject'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-sm font-semibold">
          {isApprove ? 'Approve this content?' : 'Reject this content?'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isApprove
            ? 'The link will become visible in the feed / chat.'
            : 'The content stays hidden. The user keeps the post but the link never shows.'}
        </p>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for the audit log…"
          className="mt-2 min-h-[60px] text-sm"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={isApprove ? 'default' : 'destructive'}
            disabled={busy}
            onClick={() => {
              onConfirm(note)
              setOpen(false)
              setNote('')
            }}
          >
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ItemRow({ item, onAction }: { item: ModerationItem; onAction: (id: string, action: 'APPROVE' | 'REJECT', note?: string) => void }) {
  const Icon = REASON_META[item.reason]?.icon ?? AlertTriangle
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <UserAvatar src={item.author.avatar} name={item.author.name} className="size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{item.author.name}</p>
            <span className="truncate text-xs text-muted-foreground">{item.author.email}</span>
            <span className="text-[11px] text-muted-foreground">· {TARGET_LABEL[item.targetType] ?? item.targetType}</span>
            <span className="text-[11px] text-muted-foreground">· {timeAgo(item.createdAt)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ReasonChip reason={item.reason} />
            {item.status !== 'PENDING' && (
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_CHIP[item.status])}>
                {item.status}
              </span>
            )}
            {item.adminNote ? (
              <span className="truncate text-[11px] text-muted-foreground">Note: {item.adminNote}</span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 rounded-lg bg-muted/60 p-2 text-sm">
            <Icon className="mr-1 inline size-3.5 text-muted-foreground" />
            {item.snippet || <span className="text-muted-foreground">No content captured</span>}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Mail className="size-3" />
            <span>Target ID: {item.targetId}</span>
            {item.decidedAt ? <span>· decided {timeAgo(item.decidedAt)}</span> : null}
          </div>
        </div>
        {item.status === 'PENDING' ? (
          <div className="flex shrink-0 flex-col gap-1.5">
            <ActionPopover action="APPROVE" busy={false} onConfirm={(note) => onAction(item.id, 'APPROVE', note)} />
            <ActionPopover action="REJECT" busy={false} onConfirm={(note) => onAction(item.id, 'REJECT', note)} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ModerationTab() {
  const [filter, setFilter] = useState<Filter>('PENDING')
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminModeration>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminModeration(filter)
      setData(d)
    } catch (e) {
      toast.error('Could not load moderation queue', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function action(id: string, act: 'APPROVE' | 'REJECT', note?: string) {
    setBusyId(id)
    try {
      await api.adminModerationAction(id, act, note)
      toast.success(act === 'APPROVE' ? 'Content approved — link is now visible' : 'Content rejected — link stays hidden')
      await load()
    } catch (e) {
      toast.error('Action failed', { description: errorMessage(e) })
    } finally {
      setBusyId(null)
    }
  }

  const counts = data?.counts ?? {}
  const pending = counts.PENDING ?? 0
  const approved = counts.APPROVED ?? 0
  const rejected = counts.REJECTED ?? 0
  const contactAttempts = data?.byReason.CONTACT_INFO ?? 0
  const linkReviews = data?.byReason.UNAPPROVED_LINK ?? 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Pending review" value={pending} tone="text-amber-600 dark:text-amber-400" />
        <StatCard label="Approved" value={approved} tone="text-green-600 dark:text-green-400" />
        <StatCard label="Rejected" value={rejected} tone="text-red-600 dark:text-red-400" />
        <StatCard label="Contact info blocked" value={contactAttempts} tone="text-foreground" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                filter === f.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
              {f.key === 'PENDING' && pending > 0 ? (
                <span className="ml-1 rounded-full bg-amber-500/20 px-1 text-[10px]">{pending}</span>
              ) : null}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} className="ml-auto gap-1.5">
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {linkReviews > 0 && filter === 'PENDING' ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-800 dark:text-amber-200">
            Posts and messages containing external links are held here until approved. Approving makes the link visible
            in the feed / chat. Rejecting keeps the post but hides the link permanently.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Queue is clean"
            hint={filter === 'PENDING' ? 'No content waiting for review.' : 'No moderation items for this filter.'}
          />
        ) : (
          data.items.map((item) => (
            <ItemRow key={item.id} item={item} onAction={action} />
          ))
        )}
      </div>

      {busyId ? <p className="sr-only">Processing moderation action…</p> : null}
    </div>
  )
}
