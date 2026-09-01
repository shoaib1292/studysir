'use client'

import { useEffect, useState } from 'react'
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
    default:
      return <FeedView />
  }
}

export default function StudySirApp() {
  const me = useAppStore((s) => s.me)
  const setMe = useAppStore((s) => s.setMe)
  const setNotifCount = useAppStore((s) => s.setNotifCount)
  const view = useAppStore((s) => s.view)
  const nonce = useAppStore((s) => s.nonce)

  const [loading, setLoading] = useState(true)

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

  // Realtime: socket identity + live badge/wallet/presence updates
  const meId = me?.id
  useEffect(() => {
    if (!meId) return
    const state = useAppStore.getState()
    const socket = getSocket(meId, state.me?.name ?? '')

    // debounced wallet refresh (many wallet events can burst)
    let walletTimer: ReturnType<typeof setTimeout> | null = null

    onConnect(() => {
      // fresh state after reconnect
      void api.getNotifications().then((d) => useAppStore.getState().setNotifCount(d.unread)).catch(() => null)
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

    return () => {
      if (walletTimer) clearTimeout(walletTimer)
      socket.off('connect')
      socket.off(RT.notifNew)
      socket.off(RT.walletChanged)
      socket.off(RT.presenceSnapshot)
      socket.off(RT.presenceUpdate)
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
    return <LoginScreen />
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
    </div>
  )
}
