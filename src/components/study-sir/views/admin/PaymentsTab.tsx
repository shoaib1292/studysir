'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Banknote,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Landmark,
  RefreshCw,
  Wallet,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import type { TopUpDTO, TopUpKind, TopUpStatus, WithdrawalDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { ROLE_CHIP, ROLE_LABEL } from '../../shared/constants'
import { EmptyState } from '../../shared/EmptyState'
import { timeAgo } from '../../shared/format'
import { UserAvatar } from '../../shared/UserAvatar'
import { PlansQueue } from './PlansQueue'

type PayFilter = TopUpStatus | 'ALL'
type PayAction = 'APPROVE' | 'REJECT'

const FILTERS: PayFilter[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']

const STATUS_CHIP: Record<TopUpStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  APPROVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

const KIND_META: Record<TopUpKind, { label: string; chip: string; icon: typeof Coins }> = {
  TEACHER_COINS: {
    label: 'Teacher · coins',
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    icon: Coins,
  },
  STUDENT_MONEY: {
    label: 'Student · money',
    chip: 'bg-green-500/15 text-green-700 dark:text-green-300',
    icon: Banknote,
  },
}

function pkr(n: number): string {
  return `PKR ${n.toLocaleString()}`
}

function StatusChip({ status }: { status: TopUpStatus }) {
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

function FilterPills({ value, onChange }: { value: PayFilter; onChange: (f: PayFilter) => void }) {
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

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copied`)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Could not copy', { description: 'Clipboard is unavailable in this browser.' })
    }
  }

  return (
    <button
      type="button"
      aria-label={`Copy ${label.toLowerCase()}`}
      title={`Copy ${label.toLowerCase()}`}
      onClick={() => void copy()}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {copied ? <Check className="size-3.5 text-green-600 dark:text-green-400" /> : <Copy className="size-3.5" />}
    </button>
  )
}

/** Outcome caption shown on resolved top-ups (per product spec). */
function outcomeOf(topup: TopUpDTO): string | null {
  if (topup.status === 'APPROVED') {
    return topup.kind === 'TEACHER_COINS' ? 'Coins were credited instantly.' : 'Money added to wallet.'
  }
  if (topup.status === 'REJECTED' && topup.kind === 'TEACHER_COINS') {
    return 'Coins were clawed back.'
  }
  return null
}

function TopUpCard({ topup, onChanged }: { topup: TopUpDTO; onChanged: () => void }) {
  const go = useAppStore((s) => s.go)
  const [busy, setBusy] = useState(false)
  /** which confirm popover is open (APPROVE / REJECT) */
  const [confirming, setConfirming] = useState<PayAction | null>(null)
  const [note, setNote] = useState('')
  const [proofOpen, setProofOpen] = useState(false)

  const kind = KIND_META[topup.kind]
  const KindIcon = kind.icon
  const pending = topup.status === 'PENDING'
  const user = topup.user
  const userName = user?.name ?? 'Unknown user'
  const isTeacherCoins = topup.kind === 'TEACHER_COINS'
  const outcome = outcomeOf(topup)

  function closePopover() {
    setConfirming(null)
    setNote('')
  }

  async function act(action: PayAction) {
    setBusy(true)
    try {
      await api.adminTopUpAction(topup.id, action, note.trim() || undefined)
      if (action === 'APPROVE') {
        toast.success('Payment proof approved', {
          description: isTeacherCoins ? 'Coins were credited instantly.' : 'Money added to wallet.',
        })
      } else {
        toast.success('Payment proof rejected', {
          description: isTeacherCoins ? 'Coins were clawed back.' : 'No money was added to the wallet.',
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
        <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold', kind.chip)}>
          <KindIcon className="size-3" />
          {kind.label}
        </span>
        <StatusChip status={topup.status} />
        <span className="text-xs text-muted-foreground">· {timeAgo(topup.createdAt)}</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">#{topup.id.slice(-6)}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <UserAvatar src={user?.avatar} name={userName} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            <button
              type="button"
              className="hover:underline"
              onClick={() => user && go('profile', { userId: user.id })}
            >
              {userName}
            </button>
            <RoleChip role={user?.role} />
          </p>
          {isTeacherCoins ? (
            <p className="truncate text-[11px] text-muted-foreground">
              → {topup.coinsGranted.toLocaleString()} coins to credit
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-base font-extrabold tabular-nums">{pkr(topup.amount)}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Method <span className="font-medium text-foreground">{topup.method}</span>
        </span>
        {topup.reference ? (
          <span className="min-w-0">
            Reference <span className="font-mono text-foreground">{topup.reference}</span>
          </span>
        ) : null}
      </div>

      {topup.screenshot ? (
        <button
          type="button"
          className="mt-2.5 block cursor-pointer"
          onClick={() => setProofOpen(true)}
          aria-label="View payment proof full size"
        >
          <img
            src={topup.screenshot}
            alt={`Payment screenshot — ${userName}`}
            className="h-16 rounded object-cover transition-opacity hover:opacity-90"
          />
        </button>
      ) : null}

      {outcome ? (
        <p
          className={cn(
            'mt-2 flex items-center gap-1.5 text-xs font-medium',
            topup.status === 'APPROVED' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}
        >
          {topup.status === 'APPROVED' ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {outcome}
        </p>
      ) : null}

      {topup.adminNote ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Admin note:</span> {topup.adminNote}
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
              <p className="text-sm font-semibold">Approve payment</p>
              <p className="text-xs text-muted-foreground">
                {isTeacherCoins
                  ? `Credits ${topup.coinsGranted.toLocaleString()} coins to ${userName}'s wallet instantly.`
                  : `Adds ${pkr(topup.amount)} to ${userName}'s money wallet.`}
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
              <p className="text-sm font-semibold">Reject payment</p>
              <p className="text-xs text-muted-foreground">
                No credit is issued. The user is notified and can submit a new proof.
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
              <KindIcon className="size-4 text-[#1877F2]" />
              Payment proof · #{topup.id.slice(-6)}
            </DialogTitle>
            <DialogDescription>
              Submitted {new Date(topup.createdAt).toLocaleString()} · {timeAgo(topup.createdAt)} ago
            </DialogDescription>
          </DialogHeader>
          {topup.screenshot ? (
            <img
              src={topup.screenshot}
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
              <span className="text-muted-foreground">Type</span>
              <span className="font-semibold">{kind.label}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-extrabold tabular-nums">
                {pkr(topup.amount)}
                {isTeacherCoins ? <span className="ml-1 font-medium text-muted-foreground">→ {topup.coinsGranted.toLocaleString()} coins</span> : null}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Method</span>
              <span className="font-semibold">{topup.method}</span>
            </div>
            {topup.reference ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Reference</span>
                <span className="truncate font-mono font-semibold">{topup.reference}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <StatusChip status={topup.status} />
            </div>
            {user ? (
              <div className="flex items-center justify-between gap-3 border-t pt-1.5">
                <span className="text-muted-foreground">Wallet now</span>
                <span className="font-semibold tabular-nums">
                  {isTeacherCoins ? `${user.coins.toLocaleString()} coins` : pkr(user.money)}
                </span>
              </div>
            ) : null}
            {topup.adminNote ? (
              <p className="border-t pt-1.5 text-muted-foreground">
                <span className="font-semibold">Admin note:</span> {topup.adminNote}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WithdrawalCard({ withdrawal, onChanged }: { withdrawal: WithdrawalDTO; onChanged: () => void }) {
  const go = useAppStore((s) => s.go)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<PayAction | null>(null)
  const [note, setNote] = useState('')

  const pending = withdrawal.status === 'PENDING'
  const user = withdrawal.user
  const userName = user?.name ?? 'Unknown user'

  function closePopover() {
    setConfirming(null)
    setNote('')
  }

  async function act(action: PayAction) {
    setBusy(true)
    try {
      await api.adminWithdrawalAction(withdrawal.id, action, note.trim() || undefined)
      if (action === 'APPROVE') {
        toast.success('Withdrawal marked as paid', {
          description: `${pkr(withdrawal.amount)} is on its way to ${userName}'s bank account.`,
        })
      } else {
        toast.success('Withdrawal rejected', {
          description: `${pkr(withdrawal.amount)} was returned to ${userName}'s wallet.`,
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
        <StatusChip status={withdrawal.status} />
        <span className="text-xs text-muted-foreground">· {timeAgo(withdrawal.createdAt)}</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">#{withdrawal.id.slice(-6)}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <UserAvatar src={user?.avatar} name={userName} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            <button
              type="button"
              className="hover:underline"
              onClick={() => user && go('profile', { userId: user.id })}
            >
              {userName}
            </button>
            <RoleChip role={user?.role} />
          </p>
          <p className="truncate text-[11px] text-muted-foreground">Withdrawal request</p>
        </div>
        <p className="shrink-0 text-base font-extrabold tabular-nums">{pkr(withdrawal.amount)}</p>
      </div>

      <div className="mt-2.5 rounded-lg bg-muted/60 p-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Bank details</p>
        <div className="mt-1.5 space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-muted-foreground">Bank</span>
            <span className="min-w-0 truncate font-mono font-medium">{withdrawal.bankName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-muted-foreground">Account title</span>
            <span className="min-w-0 truncate font-mono font-medium">{withdrawal.accountTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-muted-foreground">Account no.</span>
            <span className="min-w-0 truncate font-mono font-medium">{withdrawal.accountNumber}</span>
            <CopyButton value={withdrawal.accountNumber} label="Account number" />
          </div>
        </div>
      </div>

      {withdrawal.adminNote ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Admin note:</span> {withdrawal.adminNote}
        </p>
      ) : null}

      {pending ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {/* Mark as paid with optional note */}
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
                Mark as Paid
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3">
              <p className="text-sm font-semibold">Mark as paid</p>
              <p className="text-xs text-muted-foreground">
                Transfers {pkr(withdrawal.amount)} to the bank account above. Confirm only after the transfer is sent.
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
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Reject (refunds money) with optional note */}
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
              <p className="text-sm font-semibold">Reject withdrawal</p>
              <p className="text-xs text-muted-foreground">
                Rejecting returns the money to the user&apos;s wallet.
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

export default function PaymentsTab() {
  const [tab, setTab] = useState<'proofs' | 'withdrawals' | 'plans'>('proofs')

  // Payment proofs (top-up queue)
  const [topFilter, setTopFilter] = useState<PayFilter>('PENDING')
  const [topups, setTopups] = useState<TopUpDTO[] | null>(null)

  // Withdrawals queue
  const [wdFilter, setWdFilter] = useState<PayFilter>('PENDING')
  const [withdrawals, setWithdrawals] = useState<WithdrawalDTO[] | null>(null)

  const loadTopups = useCallback(async () => {
    try {
      const d = await api.adminTopUps(topFilter === 'ALL' ? undefined : topFilter)
      setTopups(d.topups)
    } catch (e) {
      setTopups([])
      toast.error('Could not load payment proofs', { description: errorMessage(e) })
    }
  }, [topFilter])

  const loadWithdrawals = useCallback(async () => {
    try {
      const d = await api.adminWithdrawals(wdFilter === 'ALL' ? undefined : wdFilter)
      setWithdrawals(d.withdrawals)
    } catch (e) {
      setWithdrawals([])
      toast.error('Could not load withdrawals', { description: errorMessage(e) })
    }
  }, [wdFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTopups()
  }, [loadTopups])

  useEffect(() => {
    if (tab !== 'withdrawals') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWithdrawals()
  }, [tab, loadWithdrawals])

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'proofs' | 'withdrawals' | 'plans')}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="proofs" className="gap-1.5">
            <Wallet className="size-4" />
            Payment Proofs
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <Crown className="size-4" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="gap-1.5">
            <Landmark className="size-4" />
            Withdrawals
          </TabsTrigger>
        </TabsList>

        {/* ===== Payment proofs (top-up requests) ===== */}
        <TabsContent value="proofs" className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPills value={topFilter} onChange={setTopFilter} />
            <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={() => void loadTopups()}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>

          {topups === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : topups.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={topFilter === 'PENDING' ? 'Queue is clear' : 'Nothing here'}
              hint={
                topFilter === 'PENDING'
                  ? 'No payment screenshots waiting for review — nice work!'
                  : 'No payment proofs match this filter.'
              }
            />
          ) : (
            <div className="space-y-3">
              {topups.map((t) => (
                <TopUpCard key={t.id} topup={t} onChanged={() => void loadTopups()} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== Plans (premium purchase proofs) ===== */}
        <TabsContent value="plans" className="mt-3">
          <PlansQueue />
        </TabsContent>

        {/* ===== Withdrawals ===== */}
        <TabsContent value="withdrawals" className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPills value={wdFilter} onChange={setWdFilter} />
            <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={() => void loadWithdrawals()}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>

          {withdrawals === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title={wdFilter === 'PENDING' ? 'No pending withdrawals' : 'Nothing here'}
              hint={
                wdFilter === 'PENDING'
                  ? 'No withdrawal requests waiting for payout.'
                  : 'No withdrawals match this filter.'
              }
            />
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <WithdrawalCard key={w.id} withdrawal={w} onChanged={() => void loadWithdrawals()} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
