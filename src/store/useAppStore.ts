import { create } from 'zustand'
import type { UserDTO } from '@/lib/types'
import { api } from '@/lib/api'

export type ViewName =
  | 'feed'
  | 'tuition'
  | 'courses'
  | 'store'
  | 'chats'
  | 'profile'
  | 'wallet'
  | 'monetize'
  | 'reviews'
  | 'settings'
  | 'admin'

export type ViewParams = Record<string, string>

interface NavEntry {
  view: ViewName
  params: ViewParams
}

interface AppState {
  me: UserDTO | null
  setMe: (me: UserDTO | null) => void
  /** Re-fetch the session user (keeps header coins/wallet in sync after spend/refund). */
  refreshMe: () => Promise<void>
  view: ViewName
  params: ViewParams
  /** Incremented on every navigation so views re-mount & re-fetch. */
  nonce: number
  go: (view: ViewName, params?: ViewParams) => void
  /** Navigate without pushing the back stack (e.g. selecting a chat thread). */
  replace: (view: ViewName, params?: ViewParams) => void
  back: () => void
  notifCount: number
  setNotifCount: (n: number) => void
  /** total unread messages across all chats (nav badge) */
  unreadChats: number
  setUnreadChats: (n: number) => void
  /** ids of users currently online (realtime presence) */
  onlineIds: string[]
  setOnlineIds: (ids: string[]) => void
  applyPresence: (userId: string, online: boolean) => void
  resetNav: () => void
}

const backStack: NavEntry[] = []

export const useAppStore = create<AppState>((set, get) => ({
  me: null,
  setMe: (me) => set({ me }),
  refreshMe: async () => {
    try {
      const { user } = await api.getSession()
      if (user) set({ me: user })
    } catch {
      // keep current user on failure
    }
  },
  view: 'feed',
  params: {},
  nonce: 0,
  go: (view, params = {}) =>
    set((s) => {
      backStack.push({ view: s.view, params: s.params })
      if (backStack.length > 25) backStack.shift()
      return { view, params, nonce: s.nonce + 1 }
    }),
  replace: (view, params = {}) =>
    set((s) => ({ view, params, nonce: s.nonce + 1 })),
  back: () => {
    const prev = backStack.pop()
    if (prev) set((s) => ({ view: prev.view, params: prev.params, nonce: s.nonce + 1 }))
    else set((s) => ({ view: 'feed', params: {}, nonce: s.nonce + 1 }))
  },
  notifCount: 0,
  setNotifCount: (notifCount) => set({ notifCount }),
  unreadChats: 0,
  setUnreadChats: (unreadChats) => set({ unreadChats }),
  onlineIds: [],
  setOnlineIds: (onlineIds) => set({ onlineIds }),
  applyPresence: (userId, online) =>
    set((s) => {
      const has = s.onlineIds.includes(userId)
      if (online && !has) return { onlineIds: [...s.onlineIds, userId] }
      if (!online && has) return { onlineIds: s.onlineIds.filter((id) => id !== userId) }
      return s
    }),
  resetNav: () => {
    backStack.length = 0
    set({ view: 'feed', params: {}, nonce: get().nonce + 1 })
  },
}))
