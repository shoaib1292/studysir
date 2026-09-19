import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { isCurrencyCode, type CurrencyCode } from '@/lib/currency'

/** GET current exchange rates. */
export async function GET() {
  try {
    await requireAdminUser()
    const rates = await db.exchangeRate.findMany({ orderBy: { code: 'asc' } })
    return NextResponse.json({ rates })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** PUT update one rate: { code, pkrPer } (owner-only). */
export async function PUT(req: NextRequest) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const body = await req.json().catch(() => null)
    const code = body?.code
    const pkrPer = Number(body?.pkrPer)
    if (!isCurrencyCode(code) || code === 'PKR') {
      return NextResponse.json({ error: 'code must be USD, EUR or INR (PKR is the base)' }, { status: 400 })
    }
    if (!Number.isFinite(pkrPer) || pkrPer <= 0 || pkrPer > 1000000) {
      return NextResponse.json({ error: 'pkrPer must be a positive number' }, { status: 400 })
    }
    const rate = await db.exchangeRate.update({ where: { code: code as CurrencyCode }, data: { pkrPer } })
    return NextResponse.json({ rate })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
