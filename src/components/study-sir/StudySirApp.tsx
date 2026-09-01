'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { api } from '@/lib/api'
import { getSocket, onConnect, onEvent, RT } from '@/lib/socket'
import { useAppStore } from '@/store/useAppStore'
import type { ViewName } from '@/store/useAppStore'
import { Header } from './layout/Header'
import { MainNav } from './layout/MainNav'
import { SideNav } from './layout/SideNav'
import { Footer } from './layout/Footer'
import { LoginScreen } from './views/LoginScreen'
import { FeedView } from './views/FeedView'
import { TuitionView } from './views/TuitionView'
import { CoursesView } from './views/CoursesView'
import { StoreView } from './views/StoreView'
import { ChatsView } from './views/ChatsView'
import { ProfileView } from './views/ProfileView'
import { WalletView } from './views/WalletView'
import { MonetizeView } from './views/MonetizeView'
import { ReviewsView } from './views/ReviewsView'
import { SettingsView } from './views/SettingsView'
import { AdminView } from './views/AdminView'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

function renderView(view: ViewName) {
  switch (view) {
    case 'feed':
      return <FeedView />
    case 'tuition':
      return <TuitionView />
    case 'courses':
      return <CoursesView />
    case 'store':
      return <StoreView />
    case 'chats':
      return <ChatsView />
    case 'profile':
      return <ProfileView />
    case 'wallet':
      return <WalletView />
    case 'monetize':
      return <MonetizeView />
    case 'reviews':
      return <ReviewsView />
    case 'settings':
      return <SettingsView />
    case 'admin':
      return <AdminView />
    default:
      return <FeedView />
  }
}

interface ChatMessagePayload {
  connectionId: string
  message: { senderId: string }
}

/** Recompute the total unread-messages badge from the connections list. */
async function refreshUnreadChats(): Promise<void> {
  try {
    const { connections } = await api.getConnections()
    const total = connections.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)
    useAppStore.getState().setUnreadChats(total)
  } catch {
    // badge is non-critical — ignore failures
  }
}

function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 shadow-lg animate-in fade-in slide-in-from-bottom-2"
    >
      <WifiOff className="size-4" />
      You are offline — some features may be unavailable until you reconnect.
    </div>
  )
}

export default function StudySirApp() {
  const me = useAppStore((s) => s.me)
  const setMe = useAppStore((s) => s.setMe)
  const setNotifCount = useAppStore((s) => s.setNotifCount)
  const view = useAppStore((s) => s.view)
  const nonce = useAppStore((s) => s.nonce)

  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(true)

  // Browser online/offline indicator
  useEffect(() => {
    const update = (e?: Event) => setOnline(e ? e.type === 'online' : navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // Reset window scroll on view change so sticky header never hides view headers
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view, nonce])

  // Session bootstrap
  useEffect(() => {
    let cancelled = false
    api
      .getSession()
      .then((d) => {
        if (!cancelled) setMe(d.user)
      })
      .catch(() => {
        // stay logged out
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setMe])

  // Notification unread count: fetch on login + poll every 30s (realtime pushes keep it exact)
  useEffect(() => {
    if (!me) return
    let cancelled = false
    async function tick() {
      try {
        const d = await api.getNotifications()
        if (!cancelled) setNotifCount(d.unread)
      } catch {
        // ignore polling failures
      }
    }
    void tick()
    const timer = setInterval(tick, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [me, setNotifCount])

  // Unread chats badge: fetch on login + on socket reconnect; live events below
  const unreadRef = useRef(refreshUnreadChats)
  useEffect(() => {
    if (!me) {
      useAppStore.getState().setUnreadChats(0)
      return
    }
    void unreadRef.current()
  }, [me])

  // Realtime: socket identity + live badge/wallet/presence updates
  const meId = me?.id
  useEffect(() => {
    if (!meId) return
    const state = useAppStore.getState()
    const socket = getSocket(meId, state.me?.name ?? '')

    // debounced wallet refresh (many wallet events can burst)
    let walletTimer: ReturnType<typeof setTimeout> | null = null
    // debounced unread-badge recompute (read receipts / unsends arrive in bursts)
    let unreadTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleUnreadRefresh = () => {
      if (unreadTimer) clearTimeout(unreadTimer)
      unreadTimer = setTimeout(() => void refreshUnreadChats(), 400)
    }

    onConnect(() => {
      // fresh state after reconnect
      void api.getNotifications().then((d) => useAppStore.getState().setNotifCount(d.unread)).catch(() => null)
      void refreshUnreadChats()
    })
    onEvent(RT.notifNew, () => {
      const s = useAppStore.getState()
      s.setNotifCount(s.notifCount + 1)
    })
    onEvent(RT.walletChanged, () => {
      if (walletTimer) clearTimeout(walletTimer)
      walletTimer = setTimeout(() => void useAppStore.getState().refreshMe(), 400)
    })
    onEvent<{ online: string[] }>(RT.presenceSnapshot, (p) => {
      useAppStore.getState().setOnlineIds(p?.online ?? [])
    })
    onEvent<{ userId: string; online: boolean }>(RT.presenceUpdate, (p) => {
      if (p?.userId) useAppStore.getState().applyPresence(p.userId, p.online)
    })
    // Unread nav badge: incoming message → optimistic increment; read/unsent → recompute
    onEvent<ChatMessagePayload>(RT.chatMessage, (p) => {
      if (p?.message && p.message.senderId !== meId) {
        const s = useAppStore.getState()
        s.setUnreadChats(s.unreadChats + 1)
      }
    })
    onEvent(RT.chatRead, scheduleUnreadRefresh)
    onEvent(RT.chatDelete, scheduleUnreadRefresh)
    onEvent(RT.chatUpdated, scheduleUnreadRefresh)

    return () => {
      if (walletTimer) clearTimeout(walletTimer)
      if (unreadTimer) clearTimeout(unreadTimer)
      socket.off('connect')
      socket.off(RT.notifNew)
      socket.off(RT.walletChanged)
      socket.off(RT.presenceSnapshot)
      socket.off(RT.presenceUpdate)
      socket.off(RT.chatMessage)
      socket.off(RT.chatRead)
      socket.off(RT.chatDelete)
      socket.off(RT.chatUpdated)
    }
  }, [meId])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="animate-pulse text-4xl font-extrabold tracking-tight text-[#1877F2]">
          Study<span className="font-black">Sir</span>
        </p>
      </div>
    )
  }

  if (!me) {
    return (
      <>
        <LoginScreen />
        <OfflineBanner online={online} />
      </>
    )
  }

  // Suspended account screen — session user was banned while logged in
  if (me.status === 'BANNED') {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-500/15">
            <ShieldOff className="size-7 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold">Account suspended</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account was suspended by a moderator for violating StudySir platform rules. If you believe this is a
            mistake, contact support.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              void api.logout().then(() => useAppStore.getState().setMe(null))
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <MainNav />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        <SideNav />
        <main key={`${view}-${nonce}`} className="min-w-0 flex-1 p-3 pb-8 md:p-5">
          {renderView(view)}
        </main>
      </div>

      <Footer />
      <OfflineBanner online={online} />
    </div>
  )
}
