import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'

/**
 * Add-money via payment screenshot (requirement G).
 * Money is credited ONLY after an admin verifies the screenshot.
 *
 * NOTE: There is deliberately no coin top-up here anymore — coins come ONLY
 * with a Premium Plan (POST /api/plans/purchase). Legacy TEACHER_COINS rows in
 * the database are still rendered by the admin queue, but new submissions are
 * always STUDENT_MONEY.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const screenshot = typeof body?.screenshot === 'string' ? body.screenshot : ''
    const method = typeof body?.method === 'string' ? body.method.slice(0, 120) : ''
    const reference = typeof body?.reference === 'string' ? body.reference.slice(0, 120) : undefined

    if (!screenshot.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Payment screenshot is required' }, { status: 400 })
    }
    if (!method) return NextResponse.json({ error: 'Select the account you paid from' }, { status: 400 })

    const amount = Math.round(Number(body?.amount))
    if (!Number.isFinite(amount) || amount < 100 || amount > 500000) {
      return NextResponse.json({ error: 'Amount must be between 100 and 500,000 PKR' }, { status: 400 })
    }

    const topup = await db.topUpRequest.create({
      data: { userId: me.id, kind: 'STUDENT_MONEY', amount, method, reference, screenshot, coinsGranted: 0 },
    })

    await notify(
      me.id,
      'SYSTEM',
      'Payment proof received',
      `Your payment proof of PKR ${amount.toLocaleString()} is under review — money is added after verification.`,
      'wallet'
    )
    rtWalletChanged([me.id])

    return NextResponse.json(
      {
        topup: { id: topup.id, status: topup.status, coinsGranted: 0, amount: topup.amount },
        coins: undefined,
      },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
