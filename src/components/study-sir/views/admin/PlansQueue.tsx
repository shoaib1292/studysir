'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Crown,
  Loader2,
  RefreshCw,
  UsersRound,
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
import { planByTier } from '@/lib/plans'
import type { PlanPurchaseDTO, PlanStatus, PlanTier } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { ROLE_CHIP, ROLE_LABEL } from '../../shared/constants'
import { EmptyState } from '../../shared/EmptyState'
import { timeAgo } from '../../shared/format'
import { UserAvatar } from '../../shared/UserAvatar'

type PlanFilter = PlanStatus | 'ALL'
type PlanAction = 'APPROVE' | 'REJECT'

const FILTERS: PlanFilter[] = ['PENDING', 'ACTIVE', 'REJECTED', 'ALL']

/** Soft alpha tier chips (dark-mode aware) — names resolve via plans.ts. */
const TIER_META: Record<PlanTier, { chip: string }> = {
  BASIC: { chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  PRO: { chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  ACADEMY: { chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
}

const STATUS_CHIP: Record<PlanStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  ACTIVE: 'bg-green-500/15 text-green-700 dark:text-green-300',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

function planName(tier: PlanTier): string {
  return planByTier(tier)?.name ?? `${tier.charAt(0)}${tier.slice(1).toLowerCase()} Plan`
}

function pkr(n: number): string {
  return `PKR ${n.toLocaleString()}`
}

function TierChip({ tier }: { tier: PlanTier }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold', TIER_META[tier].chip)}>
      <Crown className="size-3" />
      {planName(tier)}
    </span>
  )
}

function StatusChip({ status }: { status: PlanStatus }) {
  return (
    <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', STATUS_CHIP[status])}>
      {status}
    </span>
  )
}

function RoleChip({ role }: { role?: string | null }) {
  if (!role) return null
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-bold',
        ROLE_CHIP[role] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {(ROLE_LABEL[role] ?? role).toUpperCase()}
    </span>
  )
}

function FilterPills({ value, onChange }: { value: PlanFilter; onChange: (f: PlanFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={value === f}
          onClick={() => onChange(f)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            value === f ? 'bg-[#1877F2] text-white' : 'bg-muted text-muted-foreground hover:bg-secondary'
          )}
        >
          {f.toLowerCase()}
        </button>
      ))}
    </div>
  )
}

function PlanCard({ purchase, onChanged }: { purchase: PlanPurchaseDTO; onChanged: () => void }) {
  const go = useAppStore((s) => s.go)
  const [busy, setBusy] = useState(false)
  /** which confirm popover is open (APPROVE / REJECT) */
  const [confirming, setConfirming] = useState<PlanAction | null>(null)
  const [note, setNote] = useState('')
  const [proofOpen, setProofOpen] = useState(false)

  const pending = purchase.status === 'PENDING'
  const user = purchase.user
  const userName = user?.name ?? 'Unknown user'
  const affiliate = purchase.affiliate ?? null
  const name = planName(purchase.tier)

  function closePopover() {
    setConfirming(null)
    setNote('')
  }

  async function act(action: PlanAction) {
    setBusy(true)
    try {
      await api.adminPlanAction(purchase.id, action, note.trim() || undefined)
      if (action === 'APPROVE') {
        toast.success('Plan approved', {
          description: 'Coins kept' + (affiliate ? ` · commission paid to ${affiliate.name}` : ''),
        })
      } else {
        toast.success('Plan rejected', {
          description: 'Coins were clawed back.',
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
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <TierChip tier={purchase.tier} />
        <StatusChip status={purchase.status} />
        <span className="text-xs text-muted-foreground">· {timeAgo(purchase.createdAt)}</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">#{purchase.id.slice(-6)}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <UserAvatar src={user?.avatar} name={userName} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            <button
              type="button"
              className="hover:underline"
              aria-label={`View ${userName}'s profile`}
              onClick={() => user && go('profile', { userId: user.id })}
            >
              {userName}
            </button>
            <RoleChip role={user?.role} />
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            → {purchase.coinsGranted.toLocaleString()} coins granted
          </p>
        </div>
        <p className="shrink-0 text-base font-extrabold tabular-nums">{pkr(purchase.price)}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Method <span className="font-medium text-foreground">{purchase.method}</span>
        </span>
        {purchase.reference ? (
          <span className="min-w-0">
            Reference <span className="font-mono text-foreground">{purchase.reference}</span>
          </span>
        ) : null}
      </div>

      {affiliate ? (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#1877F2]/10 px-2.5 py-1.5 text-xs font-medium text-[#1877F2] dark:text-blue-400">
          <UsersRound className="size-3.5 shrink-0" />
          Referral — {affiliate.name} · earns {pkr(purchase.affiliateCommission)} on approval
        </p>
      ) : null}

      {purchase.screenshot ? (
        <button
          type="button"
          className="mt-2.5 block cursor-pointer"
          onClick={() => setProofOpen(true)}
          aria-label="View payment proof full size"
        >
          <img
            src={purchase.screenshot}
            alt={`Payment screenshot — ${userName}`}
            className="h-16 rounded object-cover transition-opacity hover:opacity-90"
          />
        </button>
      ) : null}

      {purchase.status === 'ACTIVE' ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
          <CheckCircle2 className="size-3.5" />
          Plan active — coins kept, affiliate commission paid.
        </p>
      ) : null}
      {purchase.status === 'REJECTED' ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <XCircle className="size-3.5" />
          Coins were clawed back.
        </p>
      ) : null}

      {purchase.adminNote ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Admin note:</span> {purchase.adminNote}
        </p>
      ) : null}

      {pending ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {/* Approve with optional note */}
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
              <p className="text-sm font-semibold">Approve {name}?</p>
              <p className="text-xs text-muted-foreground">
                {userName} keeps the coins and becomes a paid teacher.
                {affiliate
                  ? ` ${affiliate.name} receives ${pkr(purchase.affiliateCommission)} in their money wallet.`
                  : ''}
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Admin note (optional) — saved with the request"
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
                  {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Reject with optional note */}
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
              <p className="text-sm font-semibold">Reject plan purchase</p>
              <p className="text-xs text-muted-foreground">
                The {purchase.coinsGranted.toLocaleString()} coins granted at submission will be deducted.
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Admin note (optional) — saved with the request"
                rows={2}
                maxLength={500}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={closePopover}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void act('REJECT')}
                  className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                >
                  {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      {/* Full-size proof dialog */}
      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="size-4 text-[#1877F2]" />
              Plan proof · #{purchase.id.slice(-6)}
            </DialogTitle>
            <DialogDescription>
              Submitted {new Date(purchase.createdAt).toLocaleString()} · {timeAgo(purchase.createdAt)} ago
            </DialogDescription>
          </DialogHeader>
          {purchase.screenshot ? (
            <img
              src={purchase.screenshot}
              alt={`Payment screenshot — ${userName}`}
              className="max-h-[70vh] w-full rounded-lg border object-contain"
            />
          ) : null}
          <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">From</span>
              <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                {userName} <RoleChip role={user?.role} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-semibold">{name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-extrabold tabular-nums">
                {pkr(purchase.price)}
                <span className="ml-1 font-medium text-muted-foreground">
                  → {purchase.coinsGranted.toLocaleString()} coins
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Method</span>
              <span className="font-semibold">{purchase.method}</span>
            </div>
            {purchase.reference ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Reference</span>
                <span className="truncate font-mono font-semibold">{purchase.reference}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <StatusChip status={purchase.status} />
            </div>
            {purchase.adminNote ? (
              <p className="border-t pt-1.5 text-muted-foreground">
                <span className="font-semibold">Admin note:</span> {purchase.adminNote}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Admin verification queue for premium plan purchase proofs. */
export function PlansQueue() {
  const [filter, setFilter] = useState<PlanFilter>('PENDING')
  const [purchases, setPurchases] = useState<PlanPurchaseDTO[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminPlanPurchases(filter === 'ALL' ? undefined : filter)
      setPurchases(d.purchases)
    } catch (e) {
      setPurchases([])
      toast.error('Could not load plan purchases', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPills value={filter} onChange={setFilter} />
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1.5"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {purchases === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <EmptyState
          icon={Crown}
          title={filter === 'PENDING' ? 'Queue is clear' : 'Nothing here'}
          hint={
            filter === 'PENDING'
              ? 'No plan proofs waiting for review — nice work!'
              : 'No plan purchases match this filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => (
            <PlanCard key={p.id} purchase={p} onChanged={() => void load()} />
          ))}
        </div>
      )}
    </div>
  )
}
