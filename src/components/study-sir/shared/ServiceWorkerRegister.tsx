'use client'

import { useEffect } from 'react'

const HEAL_FLAG = 'ss-healed-at'

function isChunkError(text: string): boolean {
  return /ChunkLoadError|Loading chunk \d+ failed|dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported/i.test(
    text
  )
}

/**
 * Registers the StudySir service worker (offline shell + asset caching).
 *
 * v2 adds SELF-HEALING: if the app was loaded from a stale cached shell
 * (offline fallback after a server restart) its HTML references chunks that
 * no longer exist → ChunkLoadError / white screen. We detect that, purge
 * every service worker + cache entry, and hard-reload ONCE per session so
 * the browser gets fresh HTML + fresh chunks. This makes the app recover
 * automatically instead of staying broken until the user clears storage.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    /* ---------- self-heal: purge stale SW + caches, reload once ---------- */
    const heal = (reason: string) => {
      try {
        const last = Number(sessionStorage.getItem(HEAL_FLAG) || 0)
        if (Date.now() - last < 30_000) return // debounce: only once / 30s
        sessionStorage.setItem(HEAL_FLAG, String(Date.now()))
      } catch {
        /* private mode — proceed anyway */
      }
      console.warn(`[StudySir] self-heal (${reason}): purging SW + caches, reloading…`)
      const purgeAndReload = async () => {
        try {
          if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map((k) => caches.delete(k)))
          }
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations()
            await Promise.all(regs.map((r) => r.unregister()))
          }
        } catch {
          /* best effort */
        }
        window.location.reload()
      }
      void purgeAndReload()
    }

    const onError = (e: ErrorEvent) => {
      if (e.message && isChunkError(e.message)) heal('window.error')
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason
      const text =
        r instanceof Error ? `${r.name}: ${r.message}` : r ? String(r) : ''
      if (isChunkError(text)) heal('unhandledrejection')
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    /* ---------- stale-shell watchdog ----------
     * If the page was served from the SW offline cache while the server was
     * restarting, API calls fail with "Failed to fetch" until the server is
     * back. Once connectivity returns we do a single soft check: if a fresh
     * no-store document differs from ours (server restarted), reload once.
     * Disabled while healed recently to avoid loops. */
    let watchdogDone = false
    const checkServerFreshness = async () => {
      if (watchdogDone) return
      try {
        const res = await fetch('/', { cache: 'no-store', priority: 'low' } as RequestInit)
        if (!res.ok) return
        const fresh = await res.text()
        const ours = document.documentElement.outerHTML
        // compare the first RSC chunk reference — cheap build fingerprint
        const fp = (html: string) => html.match(/static\/chunks\/[a-z0-9]+\.js/)?.[0] ?? ''
        if (fp(fresh) && fp(ours) && fp(fresh) !== fp(ours) && !sessionStorage.getItem(HEAL_FLAG)) {
          watchdogDone = true
          heal('stale-shell')
        }
      } catch {
        /* server still down — SW offline shell is doing its job */
      }
    }
    const onOnline = () => {
      // small delay so the network is actually usable again
      setTimeout(checkServerFreshness, 1500)
    }
    window.addEventListener('online', onOnline)

    /* ---------- SW registration ---------- */
    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
        window.removeEventListener('online', onOnline)
      }
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return () => {
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
        window.removeEventListener('online', onOnline)
      }
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => null) // never block the app on SW issues
    }
    let cleanupLoad = () => {}
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register, { once: true })
      cleanupLoad = () => window.removeEventListener('load', register)
    }

    return () => {
      cleanupLoad()
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return null
}
