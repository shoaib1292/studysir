'use client'

import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  BarChart3,
  Bot,
  IdCard,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  User,
  UserCog,
  Users,
  Wallet,
  CreditCard,
  Banknote,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '../shared/UserAvatar'
import { EmptyState } from '../shared/EmptyState'
import { NotificationsPopover } from '../layout/NotificationsPopover'
import type { AdminSection } from './admin/OverviewTab'
import { OverviewTab } from './admin/OverviewTab'
import { UsersTab } from './admin/UsersTab'
import { ReportsTab } from './admin/ReportsTab'
import PaymentsTab from './admin/PaymentsTab'
import { KycTab } from './admin/KycTab'
import { EconomyTab } from './admin/EconomyTab'
import { AiEngineTab } from './admin/AiEngineTab'
import { AnalyticsTab } from './AnalyticsTab'
import { ModerationTab } from './admin/ModerationTab'
import { StaffTab } from './admin/StaffTab'
import { hasModuleAccess, accessibleModules, type AdminModule } from '@/lib/permissions'

const SECTION_META: Record<AdminSection, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Everything happening on StudySir at a glance.' },
  users: { title: 'Users', description: 'Search, review and manage every account.' },
  reports: { title: 'Reports', description: 'Review user-submitted reports and take action.' },
  moderation: { title: 'Content Moderation', description: 'Auto-flagged links & contact info. Approve links to make them visible.' },
  payments: { title: 'Payments', description: 'Verify top-up payment proofs.' },
  withdrawals: { title: 'Withdrawals', description: 'Process money-wallet withdrawal requests.' },
  kyc: { title: 'KYC', description: 'Verify teacher identity documents.' },
  plans: { title: 'Premium Plans', description: 'Approve or reject teacher plan purchases.' },
  'bank-accounts': { title: 'Bank Accounts', description: 'Manage platform payment accounts.' },
  economy: { title: 'Economy', description: 'Currency rates, commission and milestone.' },
  ai: { title: 'AI Engine', description: 'AI agents, personas, engagement and wasted-coin tracking.' },
  analytics: { title: 'Analytics', description: 'Platform growth analytics.' },
  staff: { title: 'Staff Management', description: 'Add staff & grant custom module-by-module access.' },
  settings: { title: 'Platform Settings', description: 'Commission rate and milestone payout.' },
}

/** Maps an admin section to its permission module key (for access checks). */
const SECTION_TO_MODULE: Record<AdminSection, AdminModule> = {
  overview: 'overview',
  users: 'users',
  reports: 'reports',
  moderation: 'moderation',
  payments: 'payments',
  withdrawals: 'withdrawals',
  kyc: 'kyc',
  plans: 'plans',
  'bank-accounts': 'bank-accounts',
  economy: 'economy',
  ai: 'ai',
  analytics: 'analytics',
  staff: 'staff',
  settings: 'settings',
}

const GENERAL_NAV: Array<{ key: AdminSection; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
]

const MODERATION_NAV: Array<{ key: AdminSection; label: string; icon: LucideIcon }> = [
  { key: 'reports', label: 'Reports', icon: ShieldAlert },
  { key: 'moderation', label: 'Content Moderation', icon: ScrollText },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'withdrawals', label: 'Withdrawals', icon: CreditCard },
  { key: 'kyc', label: 'KYC', icon: IdCard },
  { key: 'plans', label: 'Plans', icon: Banknote },
]

const PLATFORM_NAV: Array<{ key: AdminSection; label: string; icon: LucideIcon }> = [
  { key: 'bank-accounts', label: 'Bank Accounts', icon: Landmark },
  { key: 'economy', label: 'Economy', icon: Landmark },
  { key: 'ai', label: 'AI Engine', icon: Bot },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'staff', label: 'Staff', icon: UserCog },
]

type BadgeCounts = { reports: number; payments: number; kyc: number; moderation: number }

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

/** Shared sidebar navigation — rendered in the desktop <aside> and the mobile Sheet.
 * Each item is gated by the viewer's custom module permissions (owner = all). */
function AdminNav({
  active,
  onSelect,
  me,
  badges,
}: {
  active: AdminSection
  onSelect: (s: AdminSection) => void
  me: { isAdmin: boolean; subRole?: string | null; permissions?: string | null }
  badges: BadgeCounts | null
}) {
  const isOwner = !me.subRole || me.subRole === 'OWNER'
  const allowed = (s: AdminSection) => hasModuleAccess(me, SECTION_TO_MODULE[s])

  const badge = (key: AdminSection): number => {
    if (!badges) return 0
    if (key === 'reports') return badges.reports
    if (key === 'payments') return badges.payments
    if (key === 'kyc') return badges.kyc
    if (key === 'moderation') return badges.moderation
    return 0
  }

  // Show the Platform group only when the viewer owns at least one platform module.
  const platformVisible = PLATFORM_NAV.some((i) => allowed(i.key))
  const modVisible = MODERATION_NAV.some((i) => allowed(i.key))

  return (
    <nav aria-label="Admin sections" className="flex flex-col">
      <NavHeading>General</NavHeading>
      <div className="mt-1 flex flex-col gap-1">
        {GENERAL_NAV.filter((i) => allowed(i.key)).map((item) => (
          <NavButton key={item.key} icon={item.icon} label={item.label} active={active === item.key} onClick={() => onSelect(item.key)} />
        ))}
      </div>

      {modVisible ? (
        <>
          <NavHeading>Moderation</NavHeading>
          <div className="mt-1 flex flex-col gap-1">
            {MODERATION_NAV.filter((i) => allowed(i.key)).map((item) => (
              <NavButton key={item.key} icon={item.icon} label={item.label} active={active === item.key} onClick={() => onSelect(item.key)}>
                <NavBadge
                  count={badge(item.key)}
                  className={cn(
                    item.key === 'reports' && 'bg-amber-500/20 text-amber-300',
                    item.key === 'moderation' && 'bg-amber-500/20 text-amber-300',
                    item.key === 'payments' && 'bg-green-500/20 text-green-300',
                    item.key === 'kyc' && 'bg-sky-500/20 text-sky-300'
                  )}
                />
              </NavButton>
            ))}
          </div>
        </>
      ) : null}

      {platformVisible ? (
        <>
          <NavHeading>Platform</NavHeading>
          <div className="mt-1 flex flex-col gap-1">
            {PLATFORM_NAV.filter((i) => isOwner || allowed(i.key)).map((item) => (
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

function AdminThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="size-10 shrink-0 rounded-full hover:bg-accent"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}

export function AdminView() {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const setMe = useAppStore((s) => s.setMe)
  const isAdmin = me.isAdmin
  const isOwner = !me.subRole || me.subRole === 'OWNER'

  const [section, setSection] = useState<AdminSection>('overview')
  const [sheetOpen, setSheetOpen] = useState(false)
  /** Fetched on mount + polled for the sidebar queue badges — each tab loads its own data. */
  const [badges, setBadges] = useState<BadgeCounts | null>(null)

  // Defensive: if the viewer no longer has access to the active section (e.g. after
  // an owner trimmed their permissions), fall back to the first section they can open.
  // Computed before any early return so the hook order stays stable.
  const accessible = useMemo(() => accessibleModules(me), [me])
  const canOpen = (s: AdminSection) => hasModuleAccess(me, SECTION_TO_MODULE[s])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    const load = () => {
      api
        .adminOverview()
        .then((d) => {
          if (cancelled) return
          setBadges({
            reports: d.overview.queues.openReports,
            payments: d.overview.queues.pendingPayments + d.overview.queues.pendingWithdrawals,
            kyc: d.overview.queues.pendingKyc,
            moderation: d.overview.queues.pendingModeration,
          })
        })
        .catch(() => null)
    }
    load()
    const timer = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState icon={ShieldAlert} title="Admin access required" hint="This area is only visible to platform moderators." />
      </div>
    )
  }

  const current: AdminSection = canOpen(section) ? section : (accessible[0] ? (SECTION_TO_MODULE as Record<string, AdminSection>)[accessible[0]] ?? 'overview' : 'overview')
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
      case 'moderation':
        return <ModerationTab />
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
      case 'staff':
        return <StaffTab />
      default:
        // Sections not yet wired to a dedicated tab fall back to Overview.
        return <OverviewTab onNavigate={selectSection} />
    }
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      // demo session may already be gone — continue
    }
    setMe(null)
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar — owns the full viewport height like a real admin console */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-zinc-800/80 bg-zinc-950 p-3 text-zinc-300 lg:flex">
        <AdminBrand isOwner={isOwner} />
        <div className="mt-1 flex flex-1 flex-col">
          <AdminNav active={current} onSelect={selectSection} me={me} badges={badges} />
        </div>
        <AdminFooter onBack={() => go('feed', {})} name={me.name} />
      </aside>

      {/* Right column: console top bar + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex h-14 items-center gap-2 px-3 md:gap-3 md:px-6">
            {/* Mobile section nav */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open admin navigation"
                  className="size-10 shrink-0 rounded-full hover:bg-accent lg:hidden"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 gap-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-300">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <SheetDescription className="sr-only">Switch between admin console sections.</SheetDescription>
                <div className="flex h-full flex-col p-3">
                  <AdminBrand isOwner={isOwner} />
                  <div className="mt-1 flex-1 overflow-y-auto">
                    <AdminNav active={current} onSelect={selectSection} me={me} badges={badges} />
                  </div>
                  <AdminFooter onBack={() => go('feed', {})} name={me.name} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Console identity / section title */}
            <div className="min-w-0 flex-1">
              <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:block">
                StudySir Admin{me.subRole === 'STAFF' ? ' · Staff' : ''}
              </p>
              <h1 className="truncate text-base font-extrabold leading-tight md:text-lg">{meta.title}</h1>
            </div>

            {/* Console actions */}
            <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
              <NotificationsPopover />
              <AdminThemeToggle />
              <Button variant="outline" size="sm" onClick={() => go('feed', {})} className="hidden gap-1.5 sm:inline-flex">
                <ArrowLeft className="size-4" />
                StudySir
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Admin account menu"
                    className="rounded-full ring-[#1877F2] focus-visible:outline-none focus-visible:ring-2"
                  >
                    <UserAvatar src={me.avatar} name={me.name} className="size-9" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Signed in as {me.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => go('profile', { userId: me.id })}>
                    <User className="size-4" />
                    My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => go('feed', {})}>
                    <ArrowLeft className="size-4" />
                    Back to StudySir
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogOut className="size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Console content — full width of the remaining viewport */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <p className="mb-4 text-sm text-muted-foreground">{meta.description}</p>
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
