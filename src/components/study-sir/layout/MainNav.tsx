'use client'

import { GraduationCap, House, MessageCircle, Presentation, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { ViewName } from '@/store/useAppStore'

const TABS: Array<{ view: ViewName; label: string; icon: LucideIcon }> = [
  { view: 'feed', label: 'Home', icon: House },
  { view: 'tuition', label: 'Tution', icon: GraduationCap },
  { view: 'courses', label: 'Courses', icon: Presentation },
  { view: 'store', label: 'Store', icon: Store },
  { view: 'chats', label: 'Chats', icon: MessageCircle },
]

export function MainNav() {
  const view = useAppStore((s) => s.view)
  const go = useAppStore((s) => s.go)
  const unreadChats = useAppStore((s) => s.unreadChats)

  return (
    <nav className="sticky top-[57px] z-40 border-b bg-card">
      <div className="mx-auto flex max-w-[1400px] items-stretch justify-start gap-1 overflow-x-auto px-1 hide-scrollbar lg:justify-center">
        {TABS.map(({ view: tabView, label, icon: Icon }) => {
          const active = view === tabView
          const badge = tabView === 'chats' ? unreadChats : 0
          return (
            <button
              key={tabView}
              type="button"
              onClick={() => go(tabView)}
              aria-current={active ? 'page' : undefined}
              aria-label={badge > 0 ? `${label}, ${badge} unread` : label}
              className={cn(
                'relative flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-6 py-2 transition-colors lg:flex-row lg:gap-2 lg:px-16 lg:py-2.5',
                active ? 'text-[#1877F2]' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <span className="relative">
                <Icon className="size-5 shrink-0" />
                {badge > 0 ? (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 -top-1.5 grid min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-[16px] text-white shadow-sm ring-2 ring-card"
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] font-medium lg:text-sm">{label}</span>
              {active ? (
                <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-[#1877F2] lg:inset-x-8" />
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
