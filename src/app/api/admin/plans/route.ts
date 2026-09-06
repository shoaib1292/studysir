import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'

/** GET /api/admin/plans?status= — plan purchase verification queue (owner console). */
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const status = req.nextUrl.searchParams.get('status')
    const purchases = await db.planPurchase.findMany({
      where: status && status !== 'ALL' ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true, coins: true } },
        affiliate: { select: { id: true, name: true, avatar: true } },
      },
    })

    return NextResponse.json({
      purchases: purchases.map((p) => ({
        id: p.id,
        tier: p.tier,
        price: p.price,
        coinsGranted: p.coinsGranted,
        method: p.method,
        reference: p.reference,
        screenshot: p.screenshot,
        affiliateCommission: p.affiliateCommission,
        affiliate: p.affiliate,
        status: p.status,
        adminNote: p.adminNote,
        createdAt: p.createdAt,
        user: p.user,
      })),
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
