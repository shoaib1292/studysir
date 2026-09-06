import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { getCommissionRate, setSetting, MILESTONE_PAID_TEACHERS } from '@/lib/settings'

/** GET platform settings: commission rate + milestone status. */
export async function GET() {
  try {
    await requireAdminUser()
    const commissionRate = await getCommissionRate()
    const milestonePaid = (await getSettingOrNull('milestonePaid')) === '1'
    const paidTeachers = await countPaidTeachers()
    return NextResponse.json({ commissionRate, milestonePaid, paidTeachers, milestoneTarget: MILESTONE_PAID_TEACHERS })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** PUT { commissionRate } (owner-only). */
export async function PUT(req: NextRequest) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const body = await req.json().catch(() => null)
    if (body?.commissionRate !== undefined) {
      const rate = Number(body.commissionRate)
      if (!Number.isFinite(rate) || rate < 0 || rate > 50) {
        return NextResponse.json({ error: 'commissionRate must be between 0 and 50 (percent)' }, { status: 400 })
      }
      await setSetting('commissionRate', String(rate / 100))
    }
    return NextResponse.json({ commissionRate: await getCommissionRate() })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function getSettingOrNull(key: string): Promise<string | null> {
  const { getSetting } = await import('@/lib/settings')
  return getSetting(key)
}

/** Distinct teachers who ever bought coins. */
async function countPaidTeachers(): Promise<number> {
  const rows = await db.coinTransaction.groupBy({
    by: ['userId'],
    where: { type: 'PURCHASE', amount: { gt: 0 } },
  })
  return rows.length
}
