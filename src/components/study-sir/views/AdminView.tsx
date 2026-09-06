'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Ban,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  EyeOff,
  Eye,
  FileDown,
  IdCard,
  Landmark,
  MessageSquare,
  Package,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  UserCircle,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import type { AdminStats, AdminUserDTO, ReportDTO, ReportStatus } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { UserAvatar } from '../shared/UserAvatar'
import { EmptyState } from '../shared/EmptyState'
import { timeAgo } from '../shared/format'
import { AnalyticsTab } from './AnalyticsTab'
import PaymentsTab from './admin/PaymentsTab'
import { KycTab } from './admin/KycTab'
import { EconomyTab } from './admin/EconomyTab'
import { AiEngineTab } from './admin/AiEngineTab'

const TARGET_META: Record<string, { icon: typeof Package; label: string; chip: string }> = {
  CHAT: { icon: MessageSquare, label: 'Chat', chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  GOOD: { icon: Package, label: 'Digital Good', chip: 'bg-purple-500/15 text-purple-700 dark:text-purple-300' },
  COURSE: { icon: BookOpen, label: 'Course', chip: 'bg-teal-500/15 text-teal-700 dark:text-teal-300' },
  TUITION: { icon: Users, label: 'Tuition Post', chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  USER: { icon: UserCircle, label: 'User', chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
}

const STATUS_CHIP: Record<ReportStatus, string> = {
  OPEN: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  RESOLVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  DISMISSED: 'bg-muted text-muted-foreground',
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border bg-card p-3">
      <span className={cn('text-lg font-extrabold tabular-nums', tone)}>{value}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function ReportCard({ report, onChanged }: { report: ReportDTO; onChanged: () => void }) {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const [busy, setBusy] = useState(false)
  /** which confirm popover is open (RESOLVE / DISMISS) */
  const [confirming, setConfirming] = useState<'RESOLVE' | 'DISMISS' | null>(null)
  const [note, setNote] = useState('')
  const [alsoHide, setAlsoHide] = useState(false)
  const meta = TARGET_META[report.targetType] ?? TARGET_META.USER
  const TargetIcon = meta.icon
  const open = report.status === 'OPEN'
  const accused = report.targetUser
  const isContentTarget = ['GOOD', 'COURSE', 'TUITION'].includes(report.targetType) && !!report.targetId

  function closePopover() {
    setConfirming(null)
    setNote('')
    setAlsoHide(false)
  }

  async function act(action: 'RESOLVE' | 'DISMISS') {
    setBusy(true)
    try {
      await api.adminReportAction(report.id, action, note.trim() || undefined, action === 'RESOLVE' && alsoHide)
      toast.success(
        action === 'RESOLVE' ? 'Report resolved — reporter notified' : 'Report dismissed — reporter notified',
        alsoHide && action === 'RESOLVE' ? { description: 'The reported listing was removed from StudySir.' } : undefined
      )
      closePopover()
      onChanged()
    } catch (e) {
      toast.error('Action failed', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  async function toggleHide() {
    if (!report.targetId) return
    setBusy(true)
    try {
      const next = !report.targetHidden
      await api.adminModerateContent(report.targetType as 'GOOD' | 'COURSE' | 'TUITION', report.targetId, next)
      toast.success(next ? 'Listing removed from StudySir' : 'Listing restored', {
        description: next ? `“${report.targetLabel ?? 'The listing'}” is now hidden from feeds, stores and profiles.` : 'It is visible again everywhere.',
      })
      onChanged()
    } catch (e) {
      toast.error('Could not update listing', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  async function toggleBan() {
    if (!accused) return
    setBusy(true)
    try {
      const target = await api.getAdminUsers().then((d) => d.users.find((u) => u.id === accused.id))
      const next = target?.status === 'BANNED' ? 'ACTIVE' : 'BANNED'
      await api.adminSetUserStatus(accused.id, next)
      toast.success(next === 'BANNED' ? `${accused.name} has been suspended` : `${accused.name} has been reinstated`)
      onChanged()
    } catch (e) {
      toast.error('Could not update user', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('rounded-xl border bg-card p-4 transition-opacity', !open && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold', meta.chip)}>
          <TargetIcon className="size-3" />
          {meta.label}
        </span>
        <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', STATUS_CHIP[report.status])}>
          {report.status}
        </span>
        <span className="text-xs text-muted-foreground">· {timeAgo(report.createdAt)}</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">#{report.id.slice(-6)}</span>
      </div>

      <div className="mt-2.5 flex items-start gap-2.5">
        <UserAvatar src={report.reporter.avatar} name={report.reporter.name} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => go('profile', { userId: report.reporter.id })}
            >
              {report.reporter.name}
            </button>
            <span className="text-muted-foreground"> reported </span>
            {accused ? (
              <button
                type="button"
                className="font-semibold text-red-600 hover:underline dark:text-red-400"
                onClick={() => go('profile', { userId: accused.id })}
              >
                {accused.name}
              </button>
            ) : (
              <span className="text-muted-foreground">a listing</span>
            )}
          </p>
          <p className="mt-1 text-sm font-semibold">
            “{report.reason}”
          </p>
          {report.details ? <p className="mt-0.5 text-sm text-muted-foreground">{report.details}</p> : null}
        </div>
      </div>

      {report.targetLabel ? (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-lg bg-muted/60 p-2.5">
          {report.targetImage ? (
            <img src={report.targetImage} alt="" className="h-9 w-9 rounded object-cover" />
          ) : null}
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-medium', report.targetHidden && 'line-through decoration-red-500/60')}>
              {report.targetLabel}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-muted-foreground">Reported {meta.label.toLowerCase()}</p>
              {report.targetHidden ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1 py-px text-[10px] font-bold text-red-600 dark:text-red-400">
                  <EyeOff className="size-2.5" />
                  HIDDEN
                </span>
              ) : null}
            </div>
          </div>
          {report.targetType === 'CHAT' && report.connectionId ? (
            <Button size="sm" variant="outline" className="ml-auto shrink-0" onClick={() => go('chats', { connectionId: report.connectionId! })}>
              Open Chat
            </Button>
          ) : null}
        </div>
      ) : null}

      {report.note ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Moderator note:</span> {report.note}
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {/* Resolve with optional moderator note + optional content removal */}
          <Popover
            open={confirming === 'RESOLVE'}
            onOpenChange={(o) => {
              if (o) {
                setConfirming('RESOLVE')
                setNote('')
                setAlsoHide(false)
              } else if (confirming === 'RESOLVE') closePopover()
            }}
          >
            <PopoverTrigger asChild>
              <Button
                size="sm"
                disabled={busy}
                className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              >
                <CheckCircle2 className="mr-1.5 size-4" />
                Resolve
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3">
              <p className="text-sm font-semibold">Resolve report</p>
              {isContentTarget ? (
                <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5">
                  <Checkbox id={`hide-${report.id}`} checked={alsoHide} onCheckedChange={(v) => setAlsoHide(v === true)} className="mt-0.5" />
                  <div className="grid gap-0.5">
                    <Label htmlFor={`hide-${report.id}`} className="cursor-pointer text-xs font-medium leading-snug">
                      Also remove the {meta.label.toLowerCase()} from StudySir
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Hides it from feeds, stores and profiles. The owner is notified.</p>
                  </div>
                </div>
              ) : null}
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Moderator note (optional) — saved with the report"
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
                  onClick={() => void act('RESOLVE')}
                  className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Dismiss with optional note */}
          <Popover
            open={confirming === 'DISMISS'}
            onOpenChange={(o) => {
              if (o) {
                setConfirming('DISMISS')
                setNote('')
                setAlsoHide(false)
              } else if (confirming === 'DISMISS') closePopover()
            }}
          >
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={busy}>
                <XCircle className="mr-1.5 size-4" />
                Dismiss
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3">
              <p className="text-sm font-semibold">Dismiss report</p>
              <p className="text-xs text-muted-foreground">No action is taken against the reported content.</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Moderator note (optional) — saved with the report"
                rows={2}
                maxLength={500}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={closePopover}>
                  Cancel
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void act('DISMISS')}>
                  Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Hide / restore the reported listing (GOOD / COURSE / TUITION) */}
          {isContentTarget ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={toggleHide}
              className={cn(
                report.targetHidden
                  ? 'text-green-700 hover:bg-green-500/10 dark:text-green-400'
                  : 'text-amber-700 hover:bg-amber-500/10 dark:text-amber-400'
              )}
            >
              {report.targetHidden ? <Eye className="mr-1.5 size-4" /> : <EyeOff className="mr-1.5 size-4" />}
              {report.targetHidden ? 'Restore Listing' : 'Remove Listing'}
            </Button>
          ) : null}

          {accused && accused.id !== me.id ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              className="ml-auto text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
              onClick={toggleBan}
            >
              <Ban className="mr-1.5 size-4" />
              Ban User
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function UserRow({ user, onChanged }: { user: AdminUserDTO; onChanged: () => void }) {
  const go = useAppStore((s) => s.go)
  const me = useAppStore((s) => s.me)!
  const [busy, setBusy] = useState(false)
  const banned = user.status === 'BANNED'

  async function setStatus() {
    setBusy(true)
    try {
      await api.adminSetUserStatus(user.id, banned ? 'ACTIVE' : 'BANNED')
      toast.success(banned ? `${user.name} reinstated` : `${user.name} suspended`, {
        description: banned ? 'They can log in and use StudySir again.' : 'They can no longer log in or act on the platform.',
      })
      onChanged()
    } catch (e) {
      toast.error('Could not update user', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3', banned && 'border-red-500/40 bg-red-500/5')}>
      <button type="button" onClick={() => go('profile', { userId: user.id })} className="shrink-0">
        <UserAvatar src={user.avatar} name={user.name} className="size-10" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-bold">
          <button type="button" className="hover:underline" onClick={() => go('profile', { userId: user.id })}>
            {user.name}
          </button>
          {user.isAdmin ? (
            <span className="inline-flex items-center gap-1 rounded bg-[#1877F2]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#1877F2] dark:text-blue-400">
              <ShieldCheck className="size-3" />
              ADMIN
            </span>
          ) : null}
          {banned ? (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
              BANNED
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {user.headline ?? user.role} · {user.city ?? '—'} · {user.coins} coins
        </p>
      </div>
      <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
        <span title="Hires">{user.hireCount} hires</span>
        <span title="Posts">{user.postCount} posts</span>
        {user.openReports > 0 ? (
          <span className="font-bold text-amber-600 dark:text-amber-400" title="Open reports against this user">
            {user.openReports} open reports
          </span>
        ) : null}
      </div>
      {user.id !== me.id && !user.isAdmin ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={setStatus}
          className={cn(
            banned
              ? 'text-green-700 hover:bg-green-500/10 dark:text-green-400'
              : 'text-red-600 hover:bg-red-500/10 dark:text-red-400'
          )}
        >
          <Ban className="mr-1.5 size-3.5" />
          {banned ? 'Unban' : 'Ban'}
        </Button>
      ) : null}
    </div>
  )
}

export function AdminView() {
  const me = useAppStore((s) => s.me)!
  const isAdmin = me.isAdmin
  /** STAFF sub-accounts only see moderation (reports + users); owner manages economy/AI/payments. */
  const isOwner = !me.subRole || me.subRole === 'OWNER'

  const [tab, setTab] = useState<'reports' | 'users' | 'payments' | 'kyc' | 'economy' | 'ai' | 'analytics'>('reports')
  const [filter, setFilter] = useState<'ALL' | ReportStatus>('OPEN')
  const [reports, setReports] = useState<ReportDTO[] | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUserDTO[] | null>(null)

  const loadReports = useCallback(async () => {
    try {
      const d = await api.getAdminReports(filter === 'ALL' ? undefined : filter)
      setReports(d.reports)
      setStats(d.stats)
    } catch {
      setReports([])
    }
  }, [filter])

  const loadUsers = useCallback(async () => {
    try {
      const d = await api.getAdminUsers()
      setUsers(d.users)
    } catch {
      setUsers([])
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReports()
  }, [isAdmin, loadReports])

  useEffect(() => {
    if (!isAdmin || tab !== 'users') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers()
  }, [isAdmin, tab, loadUsers])

  const shown = useMemo(() => reports ?? [], [reports])

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState icon={ShieldAlert} title="Admin access required" hint="This area is only visible to platform moderators." />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#1877F2] text-white shadow-sm">
          <ShieldAlert className="size-6" />
        </div>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold">
            Admin Queue
            {me.subRole === 'STAFF' ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Staff · limited access
              </span>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {me.subRole === 'STAFF'
              ? 'Staff mode — review reports and manage users.'
              : 'Reports, payments, KYC, economy, AI engine and analytics.'}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-4">
        <TabsList className="w-full flex-wrap sm:w-auto">
          <TabsTrigger value="reports" className="gap-1.5">
            <ShieldAlert className="size-4" />
            Reports
            {stats && stats.open > 0 ? (
              <span className="rounded-full bg-amber-500/20 px-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                {stats.open}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="size-4" />
            Users
          </TabsTrigger>
          {isOwner ? (
            <>
              <TabsTrigger value="payments" className="gap-1.5">
                <Wallet className="size-4" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="kyc" className="gap-1.5">
                <IdCard className="size-4" />
                KYC
              </TabsTrigger>
              <TabsTrigger value="economy" className="gap-1.5">
                <Landmark className="size-4" />
                Economy
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5">
                <Bot className="size-4" />
                AI Engine
              </TabsTrigger>
            </>
          ) : null}
          {isOwner ? (
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="size-4" />
              Analytics
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="reports" className="mt-3 space-y-3">
          {stats ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard label="Open reports" value={stats.open} tone="text-amber-600 dark:text-amber-400" />
              <StatCard label="Resolved" value={stats.resolved} tone="text-green-600 dark:text-green-400" />
              <StatCard label="Dismissed" value={stats.dismissed} tone="text-muted-foreground" />
              <StatCard label="Banned users" value={stats.bannedUsers} tone="text-red-600 dark:text-red-400" />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((f) => (
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
              variant="outline"
              className="ml-auto gap-1.5"
              onClick={() => {
                // Same-origin download (Content-Disposition attachment) — cookies ride along.
                window.open('/api/admin/reports/export', '_blank')
                toast.success('Exporting reports CSV', { description: 'Check your downloads folder.' })
              }}
            >
              <FileDown className="size-4" />
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void loadReports()}>
              Refresh
            </Button>
          </div>

          {reports === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title={filter === 'OPEN' ? 'Queue is clear' : 'Nothing here'}
              hint={filter === 'OPEN' ? 'No open reports right now — nice work!' : 'No reports match this filter.'}
            />
          ) : (
            <div className="space-y-3">
              {shown.map((r) => (
                <ReportCard key={r.id} report={r} onChanged={() => void loadReports()} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-3 space-y-2.5">
          {users === null ? (
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            users.map((u) => <UserRow key={u.id} user={u} onChanged={() => void loadUsers()} />)
          )}
        </TabsContent>

        {isOwner ? (
          <>
            <TabsContent value="payments" className="mt-3">
              <PaymentsTab />
            </TabsContent>
            <TabsContent value="kyc" className="mt-3">
              <KycTab />
            </TabsContent>
            <TabsContent value="economy" className="mt-3">
              <EconomyTab />
            </TabsContent>
            <TabsContent value="ai" className="mt-3">
              <AiEngineTab />
            </TabsContent>
            <TabsContent value="analytics" className="mt-3">
              <AnalyticsTab />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </div>
  )
}
