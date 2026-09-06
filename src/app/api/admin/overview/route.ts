import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser } from '@/lib/session'
import { getSetting, MILESTONE_PAID_TEACHERS } from '@/lib/settings'
import type { AdminOverview } from '@/lib/types'

/** GET /api/admin/overview — dashboard KPIs, 14-day signup chart, pending queues, recent activity. */
export async function GET() {
  try {
    const admin = await requireAdminUser()
    void admin

    const dayMs = 24 * 60 * 60 * 1000
    const since14 = new Date(Date.now() - 13 * dayMs)
    since14.setHours(0, 0, 0, 0)

    const [
      total, teachers, students, parents, banned, admins,
      tuitions, courses, goods, shares, hiddenCount,
      openReports, pendingPayments, pendingWithdrawals, pendingKyc,
      coinSum, moneySum, commissionAgg, planPaidRows, milestonePaidSetting,
      recentUsersRows, signupRows, recentTxRows,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'TEACHER' } }),
      db.user.count({ where: { role: 'STUDENT' } }),
      db.user.count({ where: { role: 'PARENT' } }),
      db.user.count({ where: { status: 'BANNED' } }),
      db.user.count({ where: { isAdmin: true } }),
      db.tuitionPost.count(),
      db.course.count(),
      db.digitalGood.count(),
      db.sharedPost.count(),
      Promise.all([
        db.tuitionPost.count({ where: { hidden: true } }),
        db.course.count({ where: { hidden: true } }),
        db.digitalGood.count({ where: { hidden: true } }),
      ]).then(([a, b, c]) => a + b + c),
      db.report.count({ where: { status: 'OPEN' } }),
      db.topUpRequest.count({ where: { status: 'PENDING' } }),
      db.withdrawRequest.count({ where: { status: 'PENDING' } }),
      db.kycSubmission.count({ where: { status: 'PENDING' } }),
      db.user.aggregate({ _sum: { coins: true } }),
      db.user.aggregate({ _sum: { money: true } }),
      db.purchase.aggregate({ _sum: { commission: true } }),
      db.planPurchase.findMany({ where: { status: 'ACTIVE' }, select: { userId: true }, distinct: ['userId'] }),
      getSetting('milestonePaid'),
      db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, avatar: true, role: true, createdAt: true, status: true, isAdmin: true } }),
      db.user.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
      db.coinTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, userId: true, type: true, amount: true, createdAt: true, user: { select: { name: true, avatar: true } } } }),
    ])

    // 14-day signup series (fill zero days)
    const signups: { date: string; count: number }[] = []
    const buckets = new Map<string, number>()
    for (const u of signupRows) {
      const d = new Date(u.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    for (let i = 0; i < 14; i++) {
      const d = new Date(since14.getTime() + i * dayMs)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      signups.push({ date: key, count: buckets.get(key) ?? 0 })
    }

    const milestonePaid = milestonePaidSetting === '1'
    const milestoneTarget = MILESTONE_PAID_TEACHERS

    const overview: AdminOverview = {
      users: { total, teachers, students, parents, banned, admins },
      content: { tuitions, courses, goods, shares, hidden: hiddenCount },
      queues: {
        openReports,
        pendingPayments,
        pendingWithdrawals,
        pendingKyc,
        pendingCoinRequests: pendingPayments,
      },
      money: {
        coinsInCirculation: coinSum._sum.coins ?? 0,
        moneyInWallets: moneySum._sum.money ?? 0,
        commissionEarned: commissionAgg._sum.commission ?? 0,
        paidTeachers: planPaidRows.length,
        milestoneTarget,
        milestonePaid,
      },
      signups,
      recentUsers: recentUsersRows.map((u) => ({
        ...u,
        role: u.role as AdminOverview['recentUsers'][number]['role'],
        createdAt: u.createdAt.toISOString(),
      })),
      recentTx: recentTxRows.map((t) => ({
        id: t.id,
        userId: t.userId,
        userName: t.user.name,
        userAvatar: t.user.avatar,
        kind: t.type,
        amount: t.amount,
        status: 'COMPLETED',
        createdAt: t.createdAt.toISOString(),
      })),
    }

    return NextResponse.json({ overview })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
