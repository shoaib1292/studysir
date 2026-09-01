// Server-side realtime emit helper.
// Fire-and-forget POSTs to the realtime mini-service's internal bridge.
// Never throws — realtime is best-effort; REST polling remains the fallback.

const BRIDGE = process.env.REALTIME_BRIDGE_URL ?? 'http://127.0.0.1:3013'

type EmitOptions = {
  /** target user ids (events are delivered to each user's personal room) */
  userIds: (string | null | undefined)[]
}

export function rtEmit(event: string, payload: unknown, { userIds }: EmitOptions): void {
  const ids = userIds.filter((u): u is string => typeof u === 'string' && u.length > 0)
  if (ids.length === 0) return
  fetch(`${BRIDGE}/emit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, payload, userIds: ids }),
    signal: AbortSignal.timeout(1500),
  }).catch(() => null)
}

/** Standard events (kept here so routes + frontend stay in sync). */
export const RT_EVENTS = {
  chatMessage: 'chat:message',
  chatUpdated: 'chat:updated',
  chatRead: 'chat:read',
  notifNew: 'notif:new',
  walletChanged: 'wallet:changed',
} as const

/** Notify realtime that a user's wallet balance changed. */
export function rtWalletChanged(userIds: (string | null | undefined)[]): void {
  rtEmit(RT_EVENTS.walletChanged, { at: new Date().toISOString() }, { userIds })
}
