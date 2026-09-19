'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Coins,
  GraduationCap,
  IdCard,
  Landmark,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import type { AdminOverview } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UserAvatar } from '../../shared/UserAvatar'
import { EmptyState } from '../../shared/EmptyState'
import { timeAgo } from '../../shared/format'

/** Every admin console section — defined here so tabs can navigate without import cycles. */
export type AdminSection = 'overview' | 'users' | 'reports' | 'payments' | 'kyc' | 'economy' | 'ai' | 'analytics'

const REPORT_ROLE_CHIP: Record<string, string> = {
  TEACHER: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  STUDENT: 'bg-sky-600/15 text-sky-700 dark:text-sky-300',
  PARENT: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
}

const TX_META: Record<string, { chip: string; label: string }> = {
  TOPUP: { chip: 'bg-green-500/15 text-green-700 dark:text-green-300', label: 'Top-up' },
  PURCHASE: { chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', label: 'Purchase' },
  CONTACT: { chip: 'bg-red-500/15 text-red-700 dark:text-red-300', label: 'Contact' },
  MILESTONE_BONUS: { chip: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300', label: 'Milestone bonus' },
  GOOD_SALE: { chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', label: 'Good sale' },
}

/** Kinds that add coins to a wallet (everything else is a spend). */
const POSITIVE_TX = new Set(['TOPUP', 'MILESTONE_BONUS', 'GOOD_SALE', 'REFUND'])

function KpiCard({
  icon: Icon,
  label,
  value,
  tile,
  onNavigate,
}: {
  icon: LucideIcon
  label: string
  value: number
  tile: string
  onNavigate?: () => void
}) {
  const body = (
    <>
      <span className={cn('flex size-9 place-items-center rounded-lg', tile)}>
        <Icon className="size-4.5" />
      </span>
      <p className="text-2xl font-extrabold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </>
  )
  if (!onNavigate) {
    return <div className="rounded-xl border bg-card p-4">{body}</div>
  }
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="cursor-pointer rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-md"
    >
      {body}
    </button>
  )
}

/** Pure-CSS 14-day signup bar chart (no chart lib — same approach as AnalyticsTab). */
function SignupChart({ signups }: { signups: { date: string; count: number }[] }) {
  const max = Math.max(0, ...signups.map((d) => d.count))
  if (signups.length === 0 || max === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No signups in the last two weeks.
      </p>
    )
  }
  const labelEvery = (signups.length - 1) % 2 === 0 ? 0 : 1 // keep "today" labelled
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="New signups over the last 14 days">
        {signups.map((d, i) => {
          const pct = Math.max(4, Math.round((d.count / max) * 100))
          return (
            <div
              key={d.date}
              className="relative flex h-full min-w-0 flex-1 items-end"
              title={`${d.count} signups — ${d.date}`}
            >
              {d.count > 0 ? (
                <span
                  className="absolute left-1/2 z-10 -translate-x-1/2 text-[9px] font-bold tabular-nums text-muted-foreground"
                  style={{ bottom: `calc(${pct}% + 2px)` }}
                >
                  {d.count}
                </span>
              ) : null}
              <div
                className={cn('w-full rounded-t bg-[#1877F2]/80 dark:bg-blue-500/70', d.count === 0 && 'opacity-25')}
                style={{ height: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {signups.map((d, i) => (
          <span key={d.date} className="min-w-0 flex-1 truncate text-center text-[9px] tabular-nums text-muted-foreground">
            {i % 2 === labelEvery ? d.date.slice(8) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-bold tabular-nums', tone)}>{value}</span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-64 rounded-xl lg:col-span-3" />
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

/** Admin console dashboard — KPIs, signup chart, milestone, recent activity. */
export function OverviewTab({ onNavigate }: { onNavigate?: (s: AdminSection) => void }) {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminOverview()
      setData(d.overview)
      setFailed(false)
    } catch (e) {
      setFailed(true)
      toast.error('Could not load overview', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (failed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Could not load the dashboard"
        hint="Something went wrong while fetching platform stats."
        action={
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    )
  }

  if (!data) return <OverviewSkeleton />

  const { users, queues, money } = data
  const progress = money.milestoneTarget > 0 ? Math.min(100, (money.paidTeachers / money.milestoneTarget) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Live platform snapshot · updates on refresh</p>
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* KPI grid — queue cards jump to their section */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <KpiCard icon={Users} label="Total users" value={users.total} tile="bg-[#1877F2]/10 text-[#1877F2] dark:text-blue-400" />
        <KpiCard icon={GraduationCap} label="Teachers" value={users.teachers} tile="bg-amber-500/15 text-amber-600 dark:text-amber-400" />
        <KpiCard icon={UserRound} label="Students" value={users.students} tile="bg-green-500/15 text-green-600 dark:text-green-400" />
        <KpiCard
          icon={ShieldAlert}
          label="Open reports"
          value={queues.openReports}
          tile="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          onNavigate={onNavigate ? () => onNavigate('reports') : undefined}
        />
        <KpiCard
          icon={Wallet}
          label="Pending payments"
          value={queues.pendingPayments}
          tile="bg-green-500/15 text-green-600 dark:text-green-400"
          onNavigate={onNavigate ? () => onNavigate('payments') : undefined}
        />
        <KpiCard
          icon={IdCard}
          label="Pending KYC"
          value={queues.pendingKyc}
          tile="bg-sky-500/15 text-sky-600 dark:text-sky-400"
          onNavigate={onNavigate ? () => onNavigate('kyc') : undefined}
        />
        <KpiCard
          icon={Landmark}
          label="Pending withdrawals"
          value={queues.pendingWithdrawals}
          tile="bg-rose-500/15 text-rose-600 dark:text-rose-400"
          onNavigate={onNavigate ? () => onNavigate('payments') : undefined}
        />
        <KpiCard icon={Coins} label="Coins in circulation" value={money.coinsInCirculation} tile="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" />
      </div>

      {/* Signup chart + milestone / economy snapshot */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-xl border bg-card p-4 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <LayoutDashboard className="size-4 text-[#1877F2] dark:text-blue-400" />
              New signups — last 14 days
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {data.signups.reduce((a, d) => a + d.count, 0)} total
            </span>
          </div>
          <SignupChart signups={data.signups} />
        </section>

        <section className="rounded-xl border bg-card p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Trophy className="size-4 text-[#1877F2] dark:text-blue-400" />
            Milestone
          </h2>
          <Progress value={progress} className="h-2.5" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold tabular-nums">
              {money.paidTeachers.toLocaleString()} / {money.milestoneTarget.toLocaleString()} paid teachers
            </p>
            <span
              className={cn(
                'rounded px-2 py-0.5 text-[11px] font-semibold',
                money.milestonePaid ? 'bg-green-500/15 text-green-700 dark:text-green-300' : 'bg-muted text-muted-foreground'
              )}
            >
              bonus {money.milestonePaid ? 'paid 🎉' : 'pending'}
            </span>
          </div>

          <h3 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Economy snapshot</h3>
          <div className="space-y-2">
            <MiniStat label="Coins in circulation" value={money.coinsInCirculation.toLocaleString()} />
            <MiniStat label="Money in wallets" value={`Rs ${money.moneyInWallets.toLocaleString()}`} />
            <MiniStat label="Commission earned" value={`Rs ${money.commissionEarned.toLocaleString()}`} tone="text-green-600 dark:text-green-400" />
          </div>
        </section>
      </div>

      {/* Recent users + recent coin activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Users className="size-4 text-[#1877F2] dark:text-blue-400" />
            Recent signups
          </h2>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {data.recentUsers.map((u) => {
              const joined = timeAgo(u.createdAt)
              return (
                <div key={u.id} className="flex items-center gap-2.5">
                  <UserAvatar src={u.avatar} name={u.name} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold">{u.name}</span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', REPORT_ROLE_CHIP[u.role] ?? 'bg-muted text-muted-foreground')}>
                        {u.role}
                      </span>
                      {u.isAdmin ? (
                        <span className="rounded bg-[#1877F2]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#1877F2] dark:text-blue-400">
                          ADMIN
                        </span>
                      ) : null}
                      {u.status === 'BANNED' ? (
                        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                          BANNED
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{joined === 'now' ? 'joined just now' : `joined ${joined} ago`}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Coins className="size-4 text-[#1877F2] dark:text-blue-400" />
            Recent coin activity
          </h2>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {data.recentTx.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No coin transactions yet.</p>
            ) : (
              data.recentTx.map((t) => {
                const meta = TX_META[t.kind]
                const positive = POSITIVE_TX.has(t.kind)
                const joined = timeAgo(t.createdAt)
                return (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <UserAvatar src={t.userAvatar} name={t.userName} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold">{t.userName}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', meta?.chip ?? 'bg-muted text-muted-foreground')}>
                          {meta?.label ?? t.kind}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{joined === 'now' ? 'just now' : `${joined} ago`}</p>
                    </div>
                    <span className={cn('text-sm font-bold tabular-nums', positive && 'text-green-600 dark:text-green-400')}>
                      {positive ? '+' : '−'}
                      {Math.abs(t.amount).toLocaleString()}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
