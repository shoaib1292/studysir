import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

/**
 * GET /api/affiliate — the caller's affiliate program dashboard:
 * code, share link, lifetime earnings, sales count and the credited-earnings ledger.
 */
export async function GET() {
  try {
    const me = await requireSessionUser()

    const [salesCount, earnings] = await Promise.all([
      db.affiliateEarning.count({ where: { affiliateId: me.id } }),
      db.affiliateEarning.findMany({
        where: { affiliateId: me.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          affiliate: { select: { id: true } },
        },
      }),
    ])

    // buyer info for the ledger
    const buyerIds = [...new Set(earnings.map((e) => e.buyerId).filter((x): x is string => !!x))]
    const buyers = await db.user.findMany({
      where: { id: { in: buyerIds } },
      select: { id: true, name: true, avatar: true, role: true },
    })
    const buyerMap = new Map(buyers.map((b) => [b.id, b]))

    return NextResponse.json({
      joined: !!me.affiliateCode,
      code: me.affiliateCode,
      link: me.affiliateCode ? `/login?ref=${me.affiliateCode}` : null,
      lifetimeEarnings: me.affiliateEarnings,
      sales: salesCount,
      earnings: earnings.map((e) => ({
        id: e.id,
        amount: e.amount,
        tier: e.tier,
        createdAt: e.createdAt,
        buyer: e.buyerId ? buyerMap.get(e.buyerId) ?? null : null,
      })),
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
