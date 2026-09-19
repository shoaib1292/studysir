/* StudySir service worker — offline shell (v3)
 * v3: purge message channel so the app can wipe all caches when it detects
 *     a stale shell (ChunkLoadError self-heal in ServiceWorkerRegister.tsx).
 * Strategy:
 *  - cache-first: truly immutable assets only (/images, /icon*, manifest)
 *  - network-first: app chunks (/_next/static — changes between dev builds), documents
 *  - offline fallback: cached "/" document for navigations
 *  - never intercepted: /api/*, socket.io, HMR, anything with XTransformPort (gateway)
 */
const VERSION = 'ss-v3'
const STATIC_CACHE = `${VERSION}-static`
const PAGE_KEY = '/'

const PRECACHE = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      // individual puts — a single 404 must not fail the whole install
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)))
      await self.skipWaiting()
    })()
  )
})
// tip: don't call clients.claim() here — activate() does it after purging

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

// message channel: app asks us to step aside / wipe everything on self-heal
self.addEventListener('message', (event) => {
  const type = event.data && event.data.type
  if (type === 'PURGE_ALL') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      })()
    )
  }
  if (type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // never intercept dynamic traffic
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.searchParams.has('XTransformPort') ||
    url.searchParams.has('EIO')
  ) {
    return
  }

  // 1) cache-first ONLY for truly immutable assets (never change between builds)
  const isImmutable =
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icon') ||
    url.pathname === '/manifest.webmanifest'
  if (isImmutable) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) {
          const cache = await caches.open(STATIC_CACHE)
          cache.put(req, res.clone())
        }
        return res
      })()
    )
    return
  }

  // 2) network-first with cache fallback:
  //    - app chunks (/_next/static): must stay fresh across dev rebuilds & deploys
  //    - document navigations: offline → serve the cached app shell
  const isNav = req.mode === 'navigate'
  const isChunk = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/')
  if (isNav || isChunk) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok) {
            const cache = await caches.open(STATIC_CACHE)
            // navigate → store under the shared PAGE_KEY so offline reload always finds the shell
            cache.put(isNav ? PAGE_KEY : req, res.clone())
          }
          return res
        } catch {
          const fallback = await caches.match(isNav ? PAGE_KEY : req)
          if (fallback) return fallback
          if (isNav) {
            return new Response('<h1>Offline</h1><p>StudySir could not be reached. Reconnect and reload.</p>', {
              status: 503,
              headers: { 'Content-Type': 'text/html' },
            })
          }
          throw new Error('offline and not cached')
        }
      })()
    )
  }
})
