import { NextResponse } from 'next/server'
import { requireSessionUser, HttpError } from '@/lib/session'

/**
 * Instant coin purchase is DISABLED — coins are bought via the payment-screenshot
 * flow (requirement G): teacher picks a package, pays to a platform bank account,
 * uploads the proof and the coins are credited instantly, then confirmed or clawed
 * back by the platform admin. See POST /api/wallet/topup.
 */
export async function POST() {
  try {
    await requireSessionUser()
    return NextResponse.json(
      { error: 'Coin purchases now require payment verification — use "Buy Coins" and upload your payment screenshot.' },
      { status: 410 }
    )
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
