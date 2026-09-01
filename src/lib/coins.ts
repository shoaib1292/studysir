import { db } from '@/lib/db'

export const REFUND_WINDOW_DAYS = 10

/**
 * Coin cost scales with the "weight" of the tuition:
 * - average fee range drives the base cost
 * - home tuition is heavier (extra coins)
 * - clamped between 5 and 50 coins
 */
export function computeCoinCost(feeMin: number, feeMax: number, mode: string): number {
  const safeMin = Number.isFinite(feeMin) ? Math.max(0, feeMin) : 0
  const safeMax = Number.isFinite(feeMax) ? Math.max(0, feeMax) : 0
  const avg = (safeMin + safeMax) / 2
  let cost = 5 + Math.round(avg / 10)
  if (mode === 'HOME') cost += 5
  if (mode === 'CENTER') cost += 2
  return Math.min(50, Math.max(5, cost))
}

export const COIN_PACKAGES = [
  { id: 'pack_100', coins: 100, price: 1, label: 'Starter' },
  { id: 'pack_500', coins: 500, price: 4.5, label: 'Value' },
  { id: 'pack_1000', coins: 1000, price: 8, label: 'Pro' },
  { id: 'pack_5000', coins: 5000, price: 35, label: 'Academy' },
]

export async function notify(userId: string, type: string, title: string, body?: string, link?: string) {
  try {
    await db.notification.create({
      data: { userId, type, title, body, link },
    })
  } catch {
    // non-blocking
  }
}

/**
 * Refund coins for a connection (only allowed when no chat happened).
 * Refund goes to the payer (teacher in tuition flow, student in direct-contact flow).
 * Idempotent via refunded flag.
 */
export async function refundPendingConnection(connectionId: string, reason: 'REJECTED' | 'EXPIRED') {
  const conn = await db.connection.findUnique({ where: { id: connectionId } })
  if (!conn || conn.refunded) return null
  if (conn.chatStartedAt) return null // chat started => no refund
  const payerId = conn.payerId || conn.teacherId

  return db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: payerId },
      data: { coins: { increment: conn.coinsSpent } },
    })
    await tx.coinTransaction.create({
      data: {
        userId: payerId,
        amount: conn.coinsSpent,
        type: reason === 'EXPIRED' ? 'REFUND_AUTO' : 'REFUND_REJECT',
        description:
          reason === 'EXPIRED'
            ? `Auto refund — no reply within ${REFUND_WINDOW_DAYS} days (Connection ${conn.id.slice(-6)})`
            : `Refund — rejected before chat started (Connection ${conn.id.slice(-6)})`,
        connectionId: conn.id,
      },
    })
    await tx.connection.update({
      where: { id: conn.id },
      data: { refunded: true, status: reason === 'EXPIRED' ? 'EXPIRED' : 'REJECTED', decidedAt: new Date() },
    })
    return { ...conn, payerId }
  })
}

/**
 * Auto-refund all PENDING connections older than the 10-day window.
 * Called opportunistically on relevant API reads + via cron endpoint.
 */
export async function processExpiredConnections(): Promise<number> {
  const cutoff = new Date(Date.now() - REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const stale = await db.connection.findMany({
    where: { status: 'PENDING', refunded: false, chatStartedAt: null, createdAt: { lt: cutoff } },
    select: { id: true },
  })
  let count = 0
  for (const c of stale) {
    const res = await refundPendingConnection(c.id, 'EXPIRED')
    if (res) {
      count++
      await notify(
        res.payerId,
        'REFUND',
        'Coins refunded automatically',
        `No reply was received for 10 days — your ${res.coinsSpent} coins were returned to your wallet.`
      )
    }
  }
  return count
}
