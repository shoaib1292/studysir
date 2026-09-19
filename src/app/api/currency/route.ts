import { NextResponse } from 'next/server'
import { getRates } from '@/lib/settings'
import type { CurrencyCode } from '@/lib/currency'

/** Public exchange rates (PKR base) — no auth needed. */
export async function GET() {
  try {
    const rates = await getRates()
    return NextResponse.json({
      rates: rates.map((r) => ({ code: r.code as CurrencyCode, label: r.label, symbol: r.symbol, pkrPer: r.pkrPer })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
