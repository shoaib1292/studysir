import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'
import { planByTier, priceFor } from '@/lib/plans'

/**
 * POST /api/plans/purchase — teacher submits a premium plan payment proof.
 * Coins are credited INSTANTLY (like teacher coin top-ups) and clawed back
 * if the admin rejects the proof. The affiliate commission is credited to the
 * referrer's MONEY WALLET only after the admin approves.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    if (me.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can buy a premium plan' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const tier = typeof body?.tier === 'string' ? body.tier.toUpperCase() : ''
    const plan = planByTier(tier)
    if (!plan) return NextResponse.json({ error: 'Select a plan' }, { status: 400 })

    const screenshot = typeof body?.screenshot === 'string' ? body.screenshot : ''
    const method = typeof body?.method === 'string' ? body.method.slice(0, 120) : ''
    const reference = typeof body?.reference === 'string' ? body.reference.slice(0, 120) : undefined
    const refCode = typeof body?.refCode === 'string' ? body.refCode.trim().toUpperCase() : ''

    if (!screenshot.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Payment screenshot is required' }, { status: 400 })
    }
    if (!method) return NextResponse.json({ error: 'Select the account you paid from' }, { status: 400 })

    // Affiliate attribution: a valid code (not the buyer's own) unlocks the affiliate price.
    let affiliate: { id: string; name: string | null } | null = null
    if (refCode) {
      const found = await db.user.findUnique({
        where: { affiliateCode: refCode },
        select: { id: true, name: true, status: true },
      })
      if (!found || found.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Invalid affiliate code' }, { status: 400 })
      }
      if (found.id === me.id) {
        return NextResponse.json({ error: 'You cannot use your own affiliate code' }, { status: 400 })
      }
      affiliate = found
    }

    const price = priceFor(tier, !!affiliate)

    // Block duplicate PENDING purchases of the same tier (avoid double submissions)
    const pendingSame = await db.planPurchase.findFirst({
      where: { userId: me.id, tier, status: 'PENDING' },
      select: { id: true },
    })
    if (pendingSame) {
      return NextResponse.json({ error: 'This plan is already awaiting verification' }, { status: 409 })
    }

    const purchase = await db.$transaction(async (tx) => {
      const p = await tx.planPurchase.create({
        data: {
          userId: me.id,
          tier,
          price,
          coinsGranted: plan.coins,
          method,
          reference,
          screenshot,
          affiliateId: affiliate?.id ?? null,
          affiliateCommission: affiliate ? plan.affiliateCommission : 0,
        },
      })
      // Instant coin credit — clawed back if the proof is rejected.
      await tx.user.update({ where: { id: me.id }, data: { coins: { increment: plan.coins } } })
      await tx.coinTransaction.create({
        data: {
          userId: me.id,
          amount: plan.coins,
          type: 'PLAN_COINS',
          description: `${plan.name} — ${plan.coins.toLocaleString()} coins credited (verification pending)`,
        },
      })
      return p
    })

    await notify(
      me.id,
      'SYSTEM',
      `${plan.name} activated 🎉`,
      `${plan.coins.toLocaleString()} coins were added instantly. We are verifying your payment of PKR ${price.toLocaleString()}${affiliate ? ' (affiliate price)' : ''} — if it fails, the coins will be deducted.`,
      'wallet'
    )
    rtWalletChanged([me.id])

    return NextResponse.json(
      {
        purchase: {
          id: purchase.id,
          tier: purchase.tier,
          price: purchase.price,
          coinsGranted: purchase.coinsGranted,
          status: purchase.status,
        },
        coins: (await db.user.findUnique({ where: { id: me.id } }))?.coins ?? me.coins,
      },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
