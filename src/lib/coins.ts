import { db } from '@/lib/db'
import { RT_EVENTS, rtEmit, rtWalletChanged } from '@/lib/realtime'

export const REFUND_WINDOW_DAYS = 10
/** Welcome coin grant for new TEACHER accounts (students never receive coins). */
export const TEACHER_SIGNUP_COINS = 60

/**
 * Coin cost scales with the "weight" of the tuition (fees are in PKR):
 * - average fee range drives the base cost (avg 4,000 PKR ≈ 13 coins)
 * - home tuition is heavier (extra coins)
 * - clamped between 5 and 50 coins
 * (Charged to the TEACHER when they accept a request — students post & request free.)
 */
export function computeCoinCost(feeMin: number, feeMax: number, mode: string): number {
  const safeMin = Number.isFinite(feeMin) ? Math.max(0, feeMin) : 0
  const safeMax = Number.isFinite(feeMax) ? Math.max(0, feeMax) : 0
  const avg = (safeMin + safeMax) / 2
  let cost = 5 + Math.round(avg / 500)
  if (mode === 'HOME') cost += 5
  if (mode === 'CENTER') cost += 2
  return Math.min(50, Math.max(5, cost))
}

/** Direct-contact accept cost (teacher accepts a student's profile request). */
export const DIRECT_ACCEPT_COST = 10

/** Coin packages — prices in PKR (display converts to the user's currency). */
export const COIN_PACKAGES = [
  { id: 'pack_100', coins: 100, price: 280, label: 'Starter' },
  { id: 'pack_500', coins: 500, price: 1260, label: 'Value' },
  { id: 'pack_1000', coins: 1000, price: 2240, label: 'Pro' },
  { id: 'pack_5000', coins: 5000, price: 9800, label: 'Academy' },
]

export async function notify(userId: string, type: string, title: string, body?: string, link?: string) {
  try {
    await db.notification.create({
      data: { userId, type, title, body, link },
    })
    // push a live badge update to the recipient (if they're online)
    rtEmit(RT_EVENTS.notifNew, { at: new Date().toISOString() }, { userIds: [userId] })
  } catch {
    // non-blocking
  }
}

/** Did the student/parent ever send a real (non-system) message on this chat? */
export async function studentHasReplied(connectionId: string, studentId: string): Promise<boolean> {
  const count = await db.message.count({
    where: { connectionId, senderId: studentId, system: false, deletedAt: null },
  })
  return count > 0
}

/**
 * Refund coins for a connection (only when the teacher paid and no real chat
 * happened — i.e. the student never sent a message). Idempotent via refunded flag.
 */
export async function refundPendingConnection(connectionId: string, reason: 'REJECTED' | 'EXPIRED') {
  const conn = await db.connection.findUnique({ where: { id: connectionId } })
  if (!conn || conn.refunded) return null
  if (conn.coinsSpent <= 0) return null // teacher never paid (free pending request)
  if (await studentHasReplied(connectionId, conn.studentId)) return null // real chat happened => no refund
  const receiverId = conn.payerId || conn.teacherId

  const result = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: receiverId },
      data: { coins: { increment: conn.coinsSpent } },
    })
    await tx.coinTransaction.create({
      data: {
        userId: receiverId,
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
    return { ...conn, payerId: receiverId }
  })

  if (result) rtWalletChanged([result.payerId])
  return result
}

/**
 * Housekeeping (called opportunistically on reads + cron):
 * 1) PENDING > 10 days (teacher never accepted — nobody paid) → quietly expire, no refund.
 * 2) ACTIVE > 10 days where the student NEVER replied (teacher paid) → auto-refund the teacher.
 */
export async function processExpiredConnections(): Promise<number> {
  const cutoff = new Date(Date.now() - REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  let count = 0

  // 1) stale PENDING — teacher never accepted, nothing to refund
  const stalePending = await db.connection.findMany({
    where: { status: 'PENDING', refunded: false, coinsSpent: 0, createdAt: { lt: cutoff } },
    select: { id: true, studentId: true, teacherId: true },
  })
  for (const c of stalePending) {
    await db.connection.update({ where: { id: c.id }, data: { status: 'EXPIRED', decidedAt: new Date() } })
    await notify(c.studentId, 'SYSTEM', 'Request expired', 'The teacher did not respond within 10 days — the request expired.', 'chats')
    count++
  }

  // 2) accepted but student never replied → refund the teacher
  const staleActive = await db.connection.findMany({
    where: { status: 'ACTIVE', refunded: false, chatStartedAt: { not: null }, createdAt: { lt: cutoff } },
    select: { id: true },
  })
  for (const c of staleActive) {
    const res = await refundPendingConnection(c.id, 'EXPIRED')
    if (res) {
      count++
      await db.connection.update({ where: { id: c.id }, data: { status: 'EXPIRED' } })
      await notify(
        res.payerId,
        'REFUND',
        'Coins refunded automatically',
        `No reply was received for ${REFUND_WINDOW_DAYS} days — your ${res.coinsSpent} coins were returned to your wallet.`
      )
    }
  }
  return count
}
