'use client'

import { useEffect } from 'react'

/**
 * Registers the StudySir service worker (offline shell + asset caching).
 * Registration failures are silently ignored — the app is fully functional
 * without it (and browsers without SW support simply skip this).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => null) // never block the app on SW issues
    }
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
