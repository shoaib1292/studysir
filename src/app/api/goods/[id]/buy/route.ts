import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const good = await db.digitalGood.findUnique({ where: { id }, include: { seller: true } })
    if (!good) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    if (good.sellerId === me.id) return NextResponse.json({ error: 'You cannot buy your own item' }, { status: 400 })

    const already = await db.purchase.findFirst({ where: { userId: me.id, goodId: good.id } })
    if (already) return NextResponse.json({ error: 'Already purchased' }, { status: 409 })

    if (me.money < good.price) {
      return NextResponse.json(
        { error: `Insufficient money — you need Rs ${good.price.toFixed(0)} but have Rs ${me.money.toFixed(0)}` },
        { status: 402 }
      )
    }

    await db.$transaction([
      db.user.update({ where: { id: me.id }, data: { money: { decrement: good.price } } }),
      db.user.update({ where: { id: good.sellerId }, data: { money: { increment: good.price } } }),
      db.purchase.create({ data: { userId: me.id, goodId: good.id, amount: good.price } }),
    ])

    await notify(good.sellerId, 'SYSTEM', 'Item sold!', `${me.name} purchased "${good.title}" for Rs ${good.price}.`)

    const meUpdated = await db.user.findUnique({ where: { id: me.id } })
    return NextResponse.json({ ok: true, money: meUpdated?.money ?? 0 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
