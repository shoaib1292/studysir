import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { COIN_PACKAGES } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const pkg = COIN_PACKAGES.find((p) => p.id === body?.packageId)
    if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

    const transaction = await db.$transaction(async (tx) => {
      const t = await tx.coinTransaction.create({
        data: {
          userId: me.id,
          amount: pkg.coins,
          type: 'PURCHASE',
          description: `Purchased ${pkg.label} pack ($${pkg.price})`,
        },
      })
      await tx.user.update({ where: { id: me.id }, data: { coins: { increment: pkg.coins } } })
      return t
    })

    rtWalletChanged([me.id])

    const updated = await db.user.findUnique({ where: { id: me.id } })
    return NextResponse.json({
      coins: updated?.coins ?? 0,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
      },
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
