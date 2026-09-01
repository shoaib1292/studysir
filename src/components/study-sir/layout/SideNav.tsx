'use client'

import {
  BadgeDollarSign,
  Banknote,
  Coins,
  GraduationCap,
  History,
  MessageCircle,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { ViewName, ViewParams } from '@/store/useAppStore'
import { UserAvatar } from '../shared/UserAvatar'

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">{children}</p>
  )
}

function NavRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors hover:bg-secondary',
        active && 'text-[#1877F2]'
      )}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary',
          active && 'bg-[#1877F2] text-white'
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}

export function SideNav() {
  const me = useAppStore((s) => s.me)!
  const view = useAppStore((s) => s.view)
  const go = useAppStore((s) => s.go)

  const nav = (v: ViewName, params?: ViewParams) => () => go(v, params)

  return (
    <aside className="sticky top-[105px] hidden max-h-[calc(100vh-105px)] w-[280px] shrink-0 flex-col self-start overflow-y-auto p-3 lg:flex">
      {/* User row */}
      <button
        type="button"
        onClick={() => go('profile', { userId: me.id })}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary"
      >
        <UserAvatar src={me.avatar} name={me.name} className="size-10" />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold leading-tight">{me.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{me.headline ?? me.city ?? 'StudySir member'}</span>
        </span>
      </button>

      <SectionLabel>Menu</SectionLabel>
      <div className="space-y-1">
        <NavRow icon={Wallet} label="Wallet" active={view === 'wallet'} onClick={nav('wallet')} />
        <NavRow icon={MessageCircle} label="Messages" active={view === 'chats'} onClick={nav('chats')} />
        <NavRow icon={GraduationCap} label="Tution" active={view === 'tuition'} onClick={nav('tuition')} />
        <NavRow icon={ShoppingBag} label="Digital Store" active={view === 'store'} onClick={nav('store')} />
      </div>

      <SectionLabel>Monetize</SectionLabel>
      <div className="space-y-1">
        <NavRow icon={Coins} label="Buy Coins" active={false} onClick={nav('wallet', { tab: 'coins' })} />
        <NavRow icon={History} label="Coins History" active={false} onClick={nav('wallet', { tab: 'history' })} />
        <NavRow icon={Banknote} label="Money Wallet" active={false} onClick={nav('wallet', { tab: 'money' })} />
        <NavRow icon={BadgeDollarSign} label="Monetize Program" active={view === 'monetize'} onClick={nav('monetize')} />
        <NavRow icon={Star} label="Monetize Reviews" active={view === 'reviews'} onClick={nav('reviews')} />
      </div>

      <SectionLabel>More</SectionLabel>
      <div className="space-y-1">
        <NavRow icon={Settings} label="Settings" active={view === 'settings'} onClick={nav('settings')} />
        {me.isAdmin ? (
          <NavRow icon={ShieldCheck} label="Admin Queue" active={view === 'admin'} onClick={nav('admin')} />
        ) : null}
      </div>

      <p className="px-3 py-4 text-xs leading-relaxed text-muted-foreground">
        Privacy · Terms · Advertising · Cookies · StudySir © 2025
      </p>
    </aside>
  )
}
