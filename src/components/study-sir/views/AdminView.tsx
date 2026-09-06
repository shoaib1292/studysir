'use client'

import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  BarChart3,
  Bot,
  ChevronDown,
  IdCard,
  Landmark,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { AdminOverview } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EmptyState } from '../shared/EmptyState'
import type { AdminSection } from './admin/OverviewTab'
import { OverviewTab } from './admin/OverviewTab'
import { UsersTab } from './admin/UsersTab'
import { ReportsTab } from './admin/ReportsTab'
import PaymentsTab from './admin/PaymentsTab'
import { KycTab } from './admin/KycTab'
import { EconomyTab } from './admin/EconomyTab'
import { AiEngineTab } from './admin/AiEngineTab'
import { AnalyticsTab } from './AnalyticsTab'

const SECTION_META: Record<AdminSection, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Everything happening on StudySir at a glance.' },
  users: { title: 'Users', description: 'Search, review and manage every account.' },
  reports: { title: 'Reports', description: 'Review reports and take moderation action.' },
  payments: { title: 'Payments', description: 'Verify payment proofs and process withdrawals.' },
  kyc: { title: 'KYC', description: 'Verify teacher identity documents.' },
  economy: { title: 'Economy', description: 'Currency rates, bank accounts, commission and milestone.' },
  ai: { title: 'AI Engine', description: 'AI agents, personas and wasted-coin tracking.' },
  analytics: { title: 'Analytics', description: 'Platform growth analytics.' },
}

/** STAFF sub-accounts only see moderation; the owner manages the whole platform. */
const STAFF_SECTIONS: AdminSection[] = ['overview', 'users', 'reports']

const GENERAL_NAV: Array<{ key: AdminSection; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
]

const MODERATION_NAV: Array<{ key: AdminSection; label: string; icon: LucideIcon }> = [
  { key: 'reports', label: 'Reports', icon: ShieldAlert },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'kyc', label: 'KYC', icon: IdCard },
]

const PLATFORM_NAV: Array<{ key: AdminSection; label: string; icon: LucideIcon }> = [
  { key: 'economy', label: 'Economy', icon: Landmark },
  { key: 'ai', label: 'AI Engine', icon: Bot },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
]

type BadgeCounts = { reports: number; payments: number; kyc: number }

function NavBadge({ count, className }: { count: number; className: string }) {
  if (count <= 0) return null
  return <span className={cn('ml-auto rounded-full px-1.5 text-[10px] font-bold', className)}>{count}</span>
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  children,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-[#1877F2] text-white shadow' : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-white'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      {children}
    </button>
  )
}

function NavHeading({ children }: { children: string }) {
  return <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{children}</p>
}

/** Shared sidebar navigation — rendered in the desktop <aside> and the mobile Sheet. */
function AdminNav({
  active,
  onSelect,
  isOwner,
  badges,
}: {
  active: AdminSection
  onSelect: (s: AdminSection) => void
  isOwner: boolean
  badges: BadgeCounts | null
}) {
  const badge = (key: AdminSection): number => {
    if (!badges) return 0
    if (key === 'reports') return badges.reports
    if (key === 'payments') return badges.payments
    if (key === 'kyc') return badges.kyc
    return 0
  }

  return (
    <nav aria-label="Admin sections" className="flex flex-col">
      <NavHeading>General</NavHeading>
      <div className="mt-1 flex flex-col gap-1">
        {GENERAL_NAV.map((item) => (
          <NavButton key={item.key} icon={item.icon} label={item.label} active={active === item.key} onClick={() => onSelect(item.key)} />
        ))}
      </div>

      <NavHeading>Moderation</NavHeading>
      <div className="mt-1 flex flex-col gap-1">
        {MODERATION_NAV.filter((i) => isOwner || STAFF_SECTIONS.includes(i.key)).map((item) => (
          <NavButton key={item.key} icon={item.icon} label={item.label} active={active === item.key} onClick={() => onSelect(item.key)}>
            <NavBadge
              count={badge(item.key)}
              className={cn(
                item.key === 'reports' && 'bg-amber-500/20 text-amber-300',
                item.key === 'payments' && 'bg-green-500/20 text-green-300',
                item.key === 'kyc' && 'bg-sky-500/20 text-sky-300'
              )}
            />
          </NavButton>
        ))}
      </div>

      {isOwner ? (
        <>
          <NavHeading>Platform</NavHeading>
          <div className="mt-1 flex flex-col gap-1">
            {PLATFORM_NAV.map((item) => (
              <NavButton key={item.key} icon={item.icon} label={item.label} active={active === item.key} onClick={() => onSelect(item.key)} />
            ))}
          </div>
        </>
      ) : null}
    </nav>
  )
}

/** Brand tile + role chip shown at the top of the sidebar / Sheet. */
function AdminBrand({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="rounded-lg p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 place-items-center rounded-xl bg-[#1877F2]/20 text-blue-400">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-white">
            <span className="truncate">StudySir Admin</span>
            <span className="shrink-0 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-300">
              {isOwner ? 'Owner' : 'Staff'}
            </span>
          </p>
          <p className="truncate text-xs text-zinc-500">Platform console</p>
        </div>
      </div>
    </div>
  )
}

function AdminFooter({ onBack, name }: { onBack: () => void; name: string }) {
  return (
    <div className="mt-auto border-t border-zinc-800/80 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/70 hover:text-white"
      >
        <ArrowLeft className="size-4 shrink-0" />
        Back to StudySir
      </button>
      <p className="truncate px-3 pb-1 pt-1 text-[11px] text-zinc-600">Signed in as {name}</p>
    </div>
  )
}

export function AdminView() {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const isAdmin = me.isAdmin
  const isOwner = !me.subRole || me.subRole === 'OWNER'

  const [section, setSection] = useState<AdminSection>('overview')
  const [sheetOpen, setSheetOpen] = useState(false)
  /** Fetched once for the sidebar queue badges — each tab loads its own data. */
  const [badges, setBadges] = useState<BadgeCounts | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    api
      .adminOverview()
      .then((d) => {
        if (cancelled) return
        setBadges({
          reports: d.overview.queues.openReports,
          payments: d.overview.queues.pendingPayments + d.overview.queues.pendingWithdrawals,
          kyc: d.overview.queues.pendingKyc,
        })
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState icon={ShieldAlert} title="Admin access required" hint="This area is only visible to platform moderators." />
      </div>
    )
  }

  // Defensive: a restricted section (e.g. after a role change) falls back to Overview for STAFF.
  const current: AdminSection = isOwner || STAFF_SECTIONS.includes(section) ? section : 'overview'
  const meta = SECTION_META[current]

  function selectSection(s: AdminSection) {
    setSection(s)
    setSheetOpen(false)
  }

  function renderSection() {
    switch (current) {
      case 'overview':
        return <OverviewTab onNavigate={selectSection} />
      case 'users':
        return <UsersTab />
      case 'reports':
        return <ReportsTab />
      case 'payments':
        return <PaymentsTab />
      case 'kyc':
        return <KycTab />
      case 'economy':
        return <EconomyTab />
      case 'ai':
        return <AiEngineTab />
      case 'analytics':
        return <AnalyticsTab />
    }
  }

  return (
    <div className="w-full">
      {/* Mobile section bar — sticky under the app header + main nav */}
      <div className="sticky top-[111px] z-30 -mx-3 mb-3 border-b bg-background/95 px-3 py-2 backdrop-blur md:-mx-5 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 font-bold">
              <Menu className="size-4" />
              StudySir Admin
              <span className="truncate font-normal text-muted-foreground">· {meta.title}</span>
              <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0">
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <SheetDescription className="sr-only">Switch between admin console sections.</SheetDescription>
            <div className="flex h-full flex-col bg-zinc-950 p-3 text-zinc-300">
              <AdminBrand isOwner={isOwner} />
              <div className="mt-1 flex-1 overflow-y-auto">
                <AdminNav active={current} onSelect={selectSection} isOwner={isOwner} badges={badges} />
              </div>
              <AdminFooter onBack={() => go('feed', {})} name={me.name} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex w-full">
        {/* Desktop sidebar — dark professional console nav (sticky below the 57px header + 41px main nav) */}
        <aside className="sticky top-[98px] hidden h-[calc(100vh-98px)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r bg-zinc-950 p-3 text-zinc-300 dark:bg-zinc-950 lg:flex">
          <AdminBrand isOwner={isOwner} />
          <div className="mt-1 flex flex-1 flex-col">
            <AdminNav active={current} onSelect={selectSection} isOwner={isOwner} badges={badges} />
          </div>
          <AdminFooter onBack={() => go('feed', {})} name={me.name} />
        </aside>

        {/* Console content */}
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <div className="mb-4">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold">
              {meta.title}
              {me.subRole === 'STAFF' ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Staff · limited access
                </span>
              ) : null}
            </h1>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
