'use client'

import { useState } from 'react'
import { Bell, Coins, LogOut, Search, Settings, User, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { UserAvatar } from '../shared/UserAvatar'
import { NotificationsPopover } from './NotificationsPopover'

function SearchField({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  autoFocus?: boolean
  onClear?: () => void
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
        }}
        placeholder="Search Tution"
        aria-label="Search Tution"
        className="h-10 w-full rounded-full bg-[#F0F2F5] pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:bg-[#E8EBEF]"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => (onClear ? onClear() : onChange(''))}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-[#D8DADF] hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

export function Header() {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const resetNav = useAppStore((s) => s.resetNav)
  const setMe = useAppStore((s) => s.setMe)

  const [q, setQ] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  function submitSearch() {
    const query = q.trim()
    go('feed', query ? { q: query } : {})
    setMobileSearchOpen(false)
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
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 md:gap-3 md:px-4">
        {/* Wordmark */}
        <button
          type="button"
          onClick={resetNav}
          className="shrink-0 text-[22px] font-extrabold tracking-tight text-[#1877F2]"
          aria-label="StudySir home"
        >
          <span className="font-bold">Study</span>
          <span className="font-black">Sir</span>
        </button>

        {/* Desktop search */}
        <div className="hidden w-full max-w-[260px] md:block">
          <SearchField value={q} onChange={setQ} onSubmit={submitSearch} />
        </div>

        <div className="flex-1" />

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => go('wallet')}
            className="h-10 rounded-full bg-[#F0F2F5] px-3 hover:bg-[#E4E6EB]"
            aria-label={`Coins: ${me.coins}`}
          >
            <Coins className="size-5 text-amber-500" />
            <span className="text-sm font-semibold">{me.coins}</span>
          </Button>

          <NotificationsPopover />

          <button
            type="button"
            aria-label="Search"
            onClick={() => setMobileSearchOpen((o) => !o)}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full bg-[#F0F2F5] text-foreground transition-colors hover:bg-[#E4E6EB] md:hidden',
              mobileSearchOpen && 'bg-[#E4E6EB]'
            )}
          >
            {mobileSearchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Account menu" className="rounded-full ring-[#1877F2] focus-visible:outline-none focus-visible:ring-2">
                <UserAvatar src={me.avatar} name={me.name} className="size-10" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Signed in as {me.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => go('profile', { userId: me.id })}>
                <User className="size-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go('wallet')}>
                <Wallet className="size-4" />
                Wallet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go('settings')}>
                <Settings className="size-4" />
                Settings
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

      {/* Mobile expanded search row */}
      {mobileSearchOpen ? (
        <div className="border-t bg-white p-2 md:hidden">
          <SearchField value={q} onChange={setQ} onSubmit={submitSearch} autoFocus />
        </div>
      ) : null}
    </header>
  )
}
