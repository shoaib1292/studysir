'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, BarChart3, Coins, GraduationCap, MessagesSquare, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import type { AdminAnalytics, DailyCount } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function Panel({ title, icon: Icon, children, className }: { title: string; icon: typeof Users; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-4', className)}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon className="size-4 text-[#1877F2]" />
        {title}
      </h2>
      {children}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2.5">
      <p className={cn('text-lg font-extrabold leading-tight tabular-nums', tone)}>{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

/** Pure-CSS 14-day bar chart (no chart lib — light, themeable, responsive). */
function DayBars({ data, tone }: { data: DailyCount[]; tone: string }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((a, d) => a + d.count, 0)
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]" role="img" aria-label={`${total} in the last 14 days`}>
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div
              className={cn('w-full rounded-t-[3px] transition-all duration-200 group-hover:opacity-100', tone, d.count === 0 && 'opacity-25')}
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100">
              {d.count} · {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>{data[0]?.date.slice(5)}</span>
        <span className="font-semibold">{total} total</span>
        <span>{data[data.length - 1]?.date.slice(5)} (today)</span>
      </div>
    </div>
  )
}

/** Horizontal share bar (role / status distribution). */
function ShareRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value} <span className="opacity-70">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-500', tone)} style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }} />
      </div>
    </div>
  )
}

export function AnalyticsTab() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.getAdminAnalytics()
      setData(d.analytics)
    } catch (e) {
      toast.error('Could not load analytics', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Platform-wide aggregates · updates on refresh</p>
        <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Total users" value={data.users.total} tone="text-[#1877F2]" />
        <Metric label="Tuition posts" value={data.posts.tuition} />
        <Metric label="Connections" value={data.connections.total} />
        <Metric label="Messages sent" value={data.activity.messages} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Activity — new signups (14 days)" icon={Users}>
          <DayBars data={data.signupsPerDay} tone="bg-[#1877F2]/80" />
        </Panel>
        <Panel title="Activity — chat messages (14 days)" icon={MessagesSquare}>
          <DayBars data={data.messagesPerDay} tone="bg-green-500/80" />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Users by role" icon={Users}>
          <div className="space-y-2.5">
            <ShareRow label="Students" value={data.users.students} total={data.users.total} tone="bg-[#1877F2]" />
            <ShareRow label="Teachers" value={data.users.teachers} total={data.users.total} tone="bg-green-500" />
            <ShareRow label="Parents" value={data.users.parents} total={data.users.total} tone="bg-amber-500" />
            <div className="flex gap-2 pt-1">
              <Metric label="Moderators" value={data.users.admins} />
              <Metric label="Suspended" value={data.users.banned} tone="text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Panel>

        <Panel title="Connections by status" icon={GraduationCap}>
          <div className="space-y-2.5">
            <ShareRow label="Hired" value={data.connections.hired} total={data.connections.total} tone="bg-green-500" />
            <ShareRow label="Active chats" value={data.connections.active} total={data.connections.total} tone="bg-[#1877F2]" />
            <ShareRow label="Pending" value={data.connections.pending} total={data.connections.total} tone="bg-amber-500" />
            <ShareRow label="Rejected" value={data.connections.rejected} total={data.connections.total} tone="bg-red-500" />
            <ShareRow label="Expired (auto-refund)" value={data.connections.expired} total={data.connections.total} tone="bg-muted-foreground" />
            <Metric label="Refunds issued" value={data.connections.refunds} tone="text-amber-600 dark:text-amber-400" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Coin economy" icon={Coins}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Coins spent on contacts" value={data.economy.coinsSpent} />
            <Metric label="Coins purchased" value={data.economy.coinsPurchased} />
            <Metric label="Refunded coins" value={data.connections.refunds} tone="text-amber-600 dark:text-amber-400" />
            <Metric label="Platform listings hidden" value={data.posts.hidden} tone="text-red-600 dark:text-red-400" />
          </div>
        </Panel>
        <Panel title="Money flow" icon={BarChart3}>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Store revenue" value={`Rs ${data.economy.goodsRevenue}`} tone="text-green-600 dark:text-green-400" />
            <Metric label="Money added" value={`Rs ${data.economy.moneyAdded}`} />
            <Metric label="Courses published" value={data.posts.courses} />
            <Metric label="Digital goods" value={data.posts.goods} />
          </div>
        </Panel>
      </div>

      <Panel title="Engagement" icon={Activity}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Metric label="Messages" value={data.activity.messages} />
          <Metric label="Reactions" value={data.activity.reactions} />
          <Metric label="Reviews" value={data.activity.reviews} />
          <Metric label="Reports" value={data.activity.reports} />
          <Metric label="Notifications" value={data.activity.notifications} />
        </div>
      </Panel>

      {data.topSubjects.length > 0 ? (
        <Panel title="Most in-demand subjects (tuition posts)" icon={GraduationCap}>
          <div className="space-y-2.5">
            {data.topSubjects.map((s) => (
              <ShareRow
                key={s.label}
                label={s.label}
                value={s.count}
                total={data.topSubjects[0]?.count ?? 1}
                tone="bg-[#1877F2]"
              />
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
