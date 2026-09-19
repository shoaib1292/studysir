import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'

/** GET /api/admin/topups?status=PENDING — payment-proof verification queue. */
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser()
    const status = req.nextUrl.searchParams.get('status')
    const topups = await db.topUpRequest.findMany({
      where: status && status !== 'ALL' ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, name: true, avatar: true, role: true, coins: true, money: true } } },
    })
    return NextResponse.json({ topups })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
