import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { rtWalletChanged } from '@/lib/realtime'

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: 'Amount must be between 1 and 10000' }, { status: 400 })
    }

    await db.$transaction([
      db.user.update({ where: { id: me.id }, data: { money: { increment: amount } } }),
      db.coinTransaction.create({
        data: {
          userId: me.id,
          amount: 0,
          type: 'MONEY_ADD',
          description: `Added Rs ${amount} to money wallet`,
        },
      }),
    ])

    rtWalletChanged([me.id])

    const updated = await db.user.findUnique({ where: { id: me.id } })
    return NextResponse.json({ money: updated?.money ?? 0 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
