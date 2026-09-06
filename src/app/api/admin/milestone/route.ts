import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { getSetting, setSetting, MILESTONE_PAID_TEACHERS } from '@/lib/settings'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'

/** GET milestone status — paid teachers vs 1,000 target + whether the bonus was paid. */
export async function GET() {
  try {
    await requireAdminUser()
    const paid = await paidTeacherIds()
    const milestonePaid = (await getSetting('milestonePaid')) === '1'
    return NextResponse.json({ paidTeachers: paid.length, target: MILESTONE_PAID_TEACHERS, milestonePaid })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST — pay the milestone bonus (owner-only, once ever):
 * every teacher who ever paid coins gets back all the coins they spent
 * on accepting requests, as a platform bonus.
 */
export async function POST() {
  try {
    await requireAdminUser({ ownerOnly: true })
    if ((await getSetting('milestonePaid')) === '1') {
      return NextResponse.json({ error: 'Milestone bonus has already been paid' }, { status: 409 })
    }
    const paid = await paidTeacherIds()
    if (paid.length < MILESTONE_PAID_TEACHERS) {
      return NextResponse.json(
        { error: `Milestone not reached — ${paid.length}/${MILESTONE_PAID_TEACHERS} paid teachers` },
        { status: 409 }
      )
    }

    // total coins spent per teacher via SPEND_CONTACT
    const spent = await db.coinTransaction.groupBy({
      by: ['userId'],
      _sum: { amount: true },
      where: { type: 'SPEND_CONTACT', amount: { lt: 0 }, userId: { in: paid } },
    })

    let teachers = 0
    const touched: string[] = []
    for (const row of spent) {
      const refund = Math.abs(row._sum.amount ?? 0)
      if (refund <= 0) continue
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: row.userId }, data: { coins: { increment: refund } } })
        await tx.coinTransaction.create({
          data: { userId: row.userId, amount: refund, type: 'MILESTONE_BONUS', description: `1,000 paid teachers milestone — ${refund} coins returned as a platform bonus 🎉` },
        })
      })
      await notify(row.userId, 'SYSTEM', 'Milestone bonus 🎉', `StudySir reached 1,000 paid teachers — your ${refund} coins were returned as a bonus!`, 'wallet')
      touched.push(row.userId)
      teachers++
    }

    await setSetting('milestonePaid', '1')
    if (touched.length) rtWalletChanged(touched)

    return NextResponse.json({ ok: true, teachers, coinsRefunded: touched.length })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** Paid teachers = teachers with an ACTIVE premium plan purchase (Basic / Pro / Academy). */
async function paidTeacherIds(): Promise<string[]> {
  const rows = await db.planPurchase.findMany({
    where: { status: 'ACTIVE' },
    select: { userId: true },
    distinct: ['userId'],
  })
  return rows.map((r) => r.userId)
}
