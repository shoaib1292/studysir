import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import type { AdminAnalytics, DailyCount } from '@/lib/types'

/** Last N day-keys (YYYY-MM-DD, UTC) ending today. */
function lastNDays(n: number): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

/** Bucket dates into the given day keys (missing days = 0). */
function bucketize(days: string[], items: Date[]): DailyCount[] {
  const map = new Map(days.map((d) => [d, 0]))
  for (const it of items) {
    const key = it.toISOString().slice(0, 10)
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
  }
  return days.map((date) => ({ date, count: map.get(date) ?? 0 }))
}

const WINDOW_MS = 13 * 24 * 60 * 60 * 1000

/**
 * GET /api/admin/analytics
 * Platform-wide aggregates for the admin Analytics tab (admin only).
 * Kept to a handful of parallel count/aggregate queries — SQLite-friendly.
 */
export async function GET() {
  try {
    const me = await requireSessionUser()
    if (!me.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const since = new Date(Date.now() - WINDOW_MS)
    const days = lastNDays(14)

    const [
      roleGroups,
      bannedCount,
      adminCount,
      tuitionCount,
      courseCount,
      goodCount,
      hiddenTuition,
      hiddenCourses,
      hiddenGoods,
      connGroups,
      connTotal,
      refundedCount,
      spendAgg,
      coinPurchasedAgg,
      goodsRevenueAgg,
      moneyAddedAgg,
      messageCount,
      reactionCount,
      reviewCount,
      reportCount,
      notifCount,
      recentSignups,
      recentMessages,
      subjectGroups,
    ] = await Promise.all([
      db.user.groupBy({ by: ['role'], _count: { id: true } }),
      db.user.count({ where: { status: 'BANNED' } }),
      db.user.count({ where: { isAdmin: true } }),
      db.tuitionPost.count(),
      db.course.count(),
      db.digitalGood.count(),
      db.tuitionPost.count({ where: { hidden: true } }),
      db.course.count({ where: { hidden: true } }),
      db.digitalGood.count({ where: { hidden: true } }),
      db.connection.groupBy({ by: ['status'], _count: { id: true } }),
      db.connection.count(),
      db.connection.count({ where: { refunded: true } }),
      db.connection.aggregate({ _sum: { coinsSpent: true } }),
      db.coinTransaction.aggregate({ _sum: { amount: true }, where: { type: 'PURCHASE', amount: { gt: 0 } } }),
      db.purchase.aggregate({ _sum: { amount: true } }),
      db.coinTransaction.aggregate({ _sum: { amount: true }, where: { type: 'MONEY_ADD', amount: { gt: 0 } } }),
      db.message.count(),
      db.reaction.count(),
      db.review.count(),
      db.report.count(),
      db.notification.count(),
      db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      db.message.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      db.tuitionPost.groupBy({
        by: ['subjects'],
        _count: { id: true },
        where: { subjects: { not: null } },
        take: 5,
        orderBy: { _count: { id: 'desc' } },
      }),
    ])

    const roleCount = (role: string) => roleGroups.find((g) => g.role === role)?._count.id ?? 0
    const statusCount = (status: string) => connGroups.find((g) => g.status === status)?._count.id ?? 0

    const analytics: AdminAnalytics = {
      users: {
        total: roleGroups.reduce((acc, g) => acc + g._count.id, 0),
        students: roleCount('STUDENT'),
        parents: roleCount('PARENT'),
        teachers: roleCount('TEACHER'),
        admins: adminCount,
        banned: bannedCount,
      },
      posts: {
        tuition: tuitionCount,
        courses: courseCount,
        goods: goodCount,
        hidden: hiddenTuition + hiddenCourses + hiddenGoods,
      },
      connections: {
        total: connTotal,
        pending: statusCount('PENDING'),
        active: statusCount('ACTIVE'),
        hired: statusCount('HIRED'),
        rejected: statusCount('REJECTED'),
        expired: statusCount('EXPIRED'),
        refunds: refundedCount,
      },
      economy: {
        coinsSpent: spendAgg._sum.coinsSpent ?? 0,
        coinsPurchased: coinPurchasedAgg._sum.amount ?? 0,
        goodsRevenue: goodsRevenueAgg._sum.amount ?? 0,
        moneyAdded: moneyAddedAgg._sum.amount ?? 0,
      },
      activity: {
        messages: messageCount,
        reactions: reactionCount,
        reviews: reviewCount,
        reports: reportCount,
        notifications: notifCount,
      },
      signupsPerDay: bucketize(days, recentSignups.map((u) => u.createdAt)),
      messagesPerDay: bucketize(days, recentMessages.map((m) => m.createdAt)),
      topSubjects: subjectGroups
        .filter((g) => g.subjects)
        .map((g) => ({ label: (g.subjects ?? '').slice(0, 40), count: g._count.id })),
    }

    return NextResponse.json({ analytics })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
