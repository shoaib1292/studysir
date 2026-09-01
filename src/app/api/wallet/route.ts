import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

export async function GET() {
  try {
    const me = await requireSessionUser()
    const transactions = await db.coinTransaction.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({
      coins: me.coins,
      money: me.money,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
