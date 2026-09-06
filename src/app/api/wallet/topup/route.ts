import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'
import { COIN_PACKAGES } from '@/lib/coins'
import { setSetting } from '@/lib/settings'

/**
 * Payment-screenshot top-up (requirement G).
 * - TEACHER_COINS: coins are credited INSTANTLY when the proof is submitted; if the
 *   admin later rejects it the coins are clawed back ("verify nhi hoti to minus chala jaye").
 * - STUDENT_MONEY: money is credited ONLY after an admin verifies the screenshot
 *   (students wait for verification).
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const kind = body?.kind === 'TEACHER_COINS' ? 'TEACHER_COINS' : 'STUDENT_MONEY'
    const screenshot = typeof body?.screenshot === 'string' ? body.screenshot : ''
    const method = typeof body?.method === 'string' ? body.method.slice(0, 120) : ''
    const reference = typeof body?.reference === 'string' ? body.reference.slice(0, 120) : undefined

    if (!screenshot.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Payment screenshot is required' }, { status: 400 })
    }
    if (!method) return NextResponse.json({ error: 'Select the account you paid from' }, { status: 400 })

    let amount = 0
    let coinsGranted = 0

    if (kind === 'TEACHER_COINS') {
      if (me.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Only teachers buy coins' }, { status: 403 })
      }
      const pkg = COIN_PACKAGES.find((p) => p.id === body?.packageId)
      if (!pkg) return NextResponse.json({ error: 'Select a coin package' }, { status: 400 })
      amount = pkg.price
      coinsGranted = pkg.coins
    } else {
      amount = Math.round(Number(body?.amount))
      if (!Number.isFinite(amount) || amount < 100 || amount > 500000) {
        return NextResponse.json({ error: 'Amount must be between 100 and 500,000 PKR' }, { status: 400 })
      }
    }

    const topup = await db.$transaction(async (tx) => {
      const t = await tx.topUpRequest.create({
        data: { userId: me.id, kind, amount, method, reference, screenshot, coinsGranted },
      })
      if (kind === 'TEACHER_COINS' && coinsGranted > 0) {
        // Instant credit — pending verification, clawed back on rejection.
        await tx.user.update({ where: { id: me.id }, data: { coins: { increment: coinsGranted } } })
        await tx.coinTransaction.create({
          data: {
            userId: me.id,
            amount: coinsGranted,
            type: 'PURCHASE',
            description: `Coins added from ${pkgLabel(amount)} package — verification pending`,
            connectionId: null,
          },
        })
        await tx.topUpRequest.update({ where: { id: t.id }, data: { coinsGranted } })
      }
      return t
    })

    // Track how many teachers have ever purchased coins (milestone progress)
    if (kind === 'TEACHER_COINS') {
      const purchases = await db.coinTransaction.count({ where: { type: 'PURCHASE', amount: { gt: 0 } } })
      await setSetting('coinPurchaseEvents', String(purchases))
    }

    await notify(
      me.id,
      'SYSTEM',
      kind === 'TEACHER_COINS' ? `+${coinsGranted} coins added` : 'Payment proof received',
      kind === 'TEACHER_COINS'
        ? `Your coins are ready to use. We are verifying your payment proof of PKR ${amount}. If it fails, the coins will be deducted.`
        : `Your payment proof of PKR ${amount} is under review — money is added after verification.`,
      'wallet'
    )
    rtWalletChanged([me.id])

    return NextResponse.json(
      {
        topup: { id: topup.id, status: topup.status, coinsGranted: topup.coinsGranted, amount: topup.amount },
        coins: kind === 'TEACHER_COINS' ? (await db.user.findUnique({ where: { id: me.id } }))?.coins ?? me.coins : undefined,
      },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function pkgLabel(price: number): string {
  const pkg = COIN_PACKAGES.find((p) => p.price === price)
  return pkg ? `${pkg.coins} coins (${pkg.label})` : `PKR ${price}`
}
