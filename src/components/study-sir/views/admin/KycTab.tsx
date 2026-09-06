'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import type { KycDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UserAvatar } from '../../shared/UserAvatar'
import { EmptyState } from '../../shared/EmptyState'
import { timeAgo } from '../../shared/format'

type KycFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
type DocKind = 'ID Document' | 'Selfie'

const STATUS_CHIP: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  APPROVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

/** "4210112345678" → "42101-1234567-8" (returns the raw value when not 13 digits). */
function formatCnic(cnic: string): string {
  const digits = cnic.replace(/\D/g, '')
  return digits.length === 13
    ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
    : cnic
}

/** Masked form for glance-safety: "4210112345678" → "XXXXX-XXXXXXX-X". */
function maskCnic(cnic: string): string {
  return formatCnic(cnic).replace(/[0-9]/g, 'X')
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border bg-card p-3">
      <span className={cn('text-lg font-extrabold tabular-nums', tone)}>{value}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function DetailCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 p-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{children}</p>
    </div>
  )
}

/** CNIC value with an eye toggle — masked + blurred until revealed. */
function CnicCell({ cnic }: { cnic: string }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 p-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">CNIC</p>
      <div className="mt-0.5 flex items-center justify-between gap-1.5">
        <span
          className={cn('truncate font-mono text-sm font-semibold tabular-nums', !shown && 'select-none blur-[3px]')}
          aria-label={shown ? `CNIC ${formatCnic(cnic)}` : 'CNIC hidden'}
        >
          {shown ? formatCnic(cnic) : maskCnic(cnic)}
        </span>
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide CNIC' : 'Reveal CNIC'}
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}

/** Clickable document thumbnail with a bottom label band. */
function DocThumb({
  src,
  label,
  icon: Icon,
  onClick,
}: {
  src?: string | null
  label: string
  icon: typeof IdCard
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${label} full view`}
      className="group relative overflow-hidden rounded-lg border transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {src ? (
        <img src={src} alt={label} className="h-20 w-32 object-cover" />
      ) : (
        <span className="grid h-20 w-32 place-items-center bg-muted/60 text-muted-foreground">
          <Icon className="size-6" />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-0.5 text-[10px] font-semibold text-white">
        <Icon className="size-3" />
        {label}
      </span>
    </button>
  )
}

function KycCard({
  sub,
  onChanged,
  onPreview,
}: {
  sub: KycDTO
  onChanged: () => void
  onPreview: (which: DocKind) => void
}) {
  const [busy, setBusy] = useState(false)
  /** which confirm popover is open (APPROVE / REJECT) */
  const [confirming, setConfirming] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [note, setNote] = useState('')
  const pending = sub.status === 'PENDING'
  const name = sub.user?.name ?? sub.fullName
  const roleText = sub.user?.role
    ? sub.user.role.charAt(0) + sub.user.role.slice(1).toLowerCase()
    : 'Teacher'

  function closePopover() {
    setConfirming(null)
    setNote('')
  }

  async function act(action: 'APPROVE' | 'REJECT') {
    setBusy(true)
    try {
      await api.adminKycAction(sub.id, action, note.trim() || undefined)
      if (action === 'APPROVE') {
        toast.success('KYC approved — verified badge granted', {
          description: `${name}'s documents checked out.`,
        })
      } else {
        toast.success('KYC rejected — teacher can resubmit', {
          description: note.trim() ? 'They will see your note with the decision.' : 'A note would help them fix the issue.',
        })
      }
      closePopover()
      onChanged()
    } catch (e) {
      toast.error('Action failed', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('rounded-xl border bg-card p-4', !pending && 'opacity-80')}>
      {/* Applicant header */}
      <div className="flex flex-wrap items-center gap-2.5">
        <UserAvatar src={sub.user?.avatar} name={name} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            {name}
            {sub.user?.isVerified ? (
              <span
                className="inline-flex items-center gap-0.5 rounded bg-green-500/15 px-1 py-px text-[10px] font-bold text-green-700 dark:text-green-300"
                title="Verified badge granted"
              >
                <ShieldCheck className="size-3" />
                VERIFIED
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {roleText} · {sub.city || sub.user?.city || '—'} · submitted {timeAgo(sub.createdAt)}
            {sub.decidedAt ? ` · decided ${timeAgo(sub.decidedAt)}` : ''}
          </p>
        </div>
        <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', STATUS_CHIP[sub.status] ?? '')}>
          {sub.status}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">#{sub.id.slice(-6)}</span>
      </div>

      {/* Identity details */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DetailCell label="Full Name">{sub.fullName}</DetailCell>
        <CnicCell cnic={sub.cnic} />
        <DetailCell label="Phone">{sub.phone}</DetailCell>
        <DetailCell label="City">{sub.city || '—'}</DetailCell>
      </div>

      {/* Document thumbnails */}
      <div className="mt-3 flex flex-wrap gap-2.5">
        <DocThumb src={sub.documentImage} label="ID Document" icon={IdCard} onClick={() => onPreview('ID Document')} />
        {sub.selfieImage ? (
          <DocThumb src={sub.selfieImage} label="Selfie" icon={Camera} onClick={() => onPreview('Selfie')} />
        ) : null}
      </div>

      {sub.adminNote ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Admin note:</span> {sub.adminNote}
        </p>
      ) : null}

      {/* Approve / Reject (PENDING only) */}
      {pending ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          <Popover
            open={confirming === 'APPROVE'}
            onOpenChange={(o) => {
              if (o) {
                setConfirming('APPROVE')
                setNote('')
              } else if (confirming === 'APPROVE') closePopover()
            }}
          >
            <PopoverTrigger asChild>
              <Button
                size="sm"
                disabled={busy}
                className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              >
                <CheckCircle2 className="mr-1.5 size-4" />
                Approve
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3">
              <p className="text-sm font-semibold">Approve verification</p>
              <p className="text-xs text-muted-foreground">
                {name} gets the verified badge and an approval notification.
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Admin note (optional) — saved with the decision"
                rows={2}
                maxLength={500}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={closePopover}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void act('APPROVE')}
                  className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover
            open={confirming === 'REJECT'}
            onOpenChange={(o) => {
              if (o) {
                setConfirming('REJECT')
                setNote('')
              } else if (confirming === 'REJECT') closePopover()
            }}
          >
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy}>
                <XCircle className="mr-1.5 size-4" />
                Reject
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3">
              <p className="text-sm font-semibold">Reject verification</p>
              <p className="text-xs text-muted-foreground">
                The teacher can resubmit after fixing the issues — a note tells them what to correct.
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Admin note (optional) — e.g. “CNIC photo is blurry”"
                rows={2}
                maxLength={500}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={closePopover}>
                  Cancel
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void act('REJECT')}>
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}
    </div>
  )
}

export function KycTab() {
  const [subs, setSubs] = useState<KycDTO[] | null>(null)
  const [filter, setFilter] = useState<KycFilter>('PENDING')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ sub: KycDTO; which: DocKind } | null>(null)

  /** Full fetch of all statuses — stats and the filtered list both derive from it. */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminKyc()
      setSubs(d.submissions)
    } catch (e) {
      toast.error('Could not load KYC queue', { description: errorMessage(e) })
      setSubs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const list = subs ?? []
    return {
      pending: list.filter((s) => s.status === 'PENDING').length,
      approved: list.filter((s) => s.status === 'APPROVED').length,
      rejected: list.filter((s) => s.status === 'REJECTED').length,
    }
  }, [subs])

  /** Pending first (it's a queue), newest first within each group. */
  const shown = useMemo(() => {
    const list = subs ?? []
    const filtered = filter === 'ALL' ? list : list.filter((s) => s.status === filter)
    return [...filtered].sort((a, b) => {
      const ap = a.status === 'PENDING' ? 0 : 1
      const bp = b.status === 'PENDING' ? 0 : 1
      if (ap !== bp) return ap - bp
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [subs, filter])

  const previewSrc = preview
    ? preview.which === 'ID Document'
      ? preview.sub.documentImage
      : preview.sub.selfieImage
    : undefined

  return (
    <div className="mt-3 space-y-3">
      {/* Queue stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Pending" value={stats.pending} tone="text-amber-600 dark:text-amber-400" />
        <StatCard label="Approved" value={stats.approved} tone="text-green-600 dark:text-green-400" />
        <StatCard label="Rejected" value={stats.rejected} tone="text-red-600 dark:text-red-400" />
      </div>

      {/* Status filter pills + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
              filter === f ? 'bg-[#1877F2] text-white' : 'bg-muted text-muted-foreground hover:bg-secondary'
            )}
          >
            {f.toLowerCase()}
          </button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1.5"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Queue list */}
      {subs === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={filter === 'PENDING' ? 'Queue is clear' : 'Nothing here'}
          hint={
            filter === 'PENDING'
              ? 'No teacher verifications waiting for review — nice work!'
              : 'No submissions match this filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((s) => (
            <KycCard key={s.id} sub={s} onChanged={() => void load()} onPreview={(which) => setPreview({ sub: s, which })} />
          ))}
        </div>
      )}

      {/* Full document preview + all details */}
      <Dialog
        open={preview !== null}
        onOpenChange={(o) => {
          if (!o) setPreview(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {preview ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {preview.which} — {preview.sub.user?.name ?? preview.sub.fullName}
                </DialogTitle>
                <DialogDescription>
                  Submitted {timeAgo(preview.sub.createdAt)} · {preview.sub.fullName} · #{preview.sub.id.slice(-6)}
                </DialogDescription>
              </DialogHeader>
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt={`${preview.which} of ${preview.sub.fullName}`}
                  className="max-h-[70vh] w-full rounded-lg border object-contain"
                />
              ) : (
                <div className="grid h-40 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                  No image attached
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <DetailCell label="Full Name">{preview.sub.fullName}</DetailCell>
                <DetailCell label="CNIC">{formatCnic(preview.sub.cnic)}</DetailCell>
                <DetailCell label="Phone">{preview.sub.phone}</DetailCell>
                <DetailCell label="City">{preview.sub.city || '—'}</DetailCell>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
