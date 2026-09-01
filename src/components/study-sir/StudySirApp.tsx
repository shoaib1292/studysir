'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
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

  // Notification unread count: fetch on login + poll every 30s
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

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F0F2F5]">
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
    <div className="flex min-h-screen flex-col bg-[#F0F2F5]">
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
