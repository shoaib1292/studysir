import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'
import { planByTier } from '@/lib/plans'

/**
 * POST /api/admin/plans/[id] — verify a plan purchase proof.
 * APPROVE: purchase becomes ACTIVE (the teacher is now a "paid teacher" for the
 *          1,000 milestone) and the affiliate's money wallet is credited.
 * REJECT:  the instantly-granted coins are clawed back.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await params
    const body = await req.json().catch(() => null)
    const action = body?.action === 'APPROVE' ? 'APPROVE' : body?.action === 'REJECT' ? 'REJECT' : null
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : undefined

    const purchase = await db.planPurchase.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        affiliate: { select: { id: true, name: true } },
      },
    })
    if (!purchase) return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    if (purchase.status !== 'PENDING') {
      return NextResponse.json({ error: `Already ${purchase.status.toLowerCase()}` }, { status: 409 })
    }
    if (!action) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    if (action === 'APPROVE') {
      await db.$transaction(async (tx) => {
        await tx.planPurchase.update({
          where: { id: purchase.id },
          data: { status: 'ACTIVE', adminNote: note, decidedAt: new Date() },
        })
        // Affiliate commission → the referrer's MONEY wallet (withdrawable like normal money).
        if (purchase.affiliateId && purchase.affiliateCommission > 0) {
          await tx.user.update({
            where: { id: purchase.affiliateId },
            data: {
              money: { increment: purchase.affiliateCommission },
              affiliateEarnings: { increment: purchase.affiliateCommission },
            },
          })
          await tx.affiliateEarning.create({
            data: {
              affiliateId: purchase.affiliateId,
              purchaseId: purchase.id,
              buyerId: purchase.userId,
              tier: purchase.tier,
              amount: purchase.affiliateCommission,
            },
          })
        }
      })

      if (purchase.affiliateId && purchase.affiliateCommission > 0) {
        rtWalletChanged([purchase.affiliateId])
        await notify(
          purchase.affiliateId,
          'SYSTEM',
          'Affiliate commission earned 💰',
          `${purchase.user.name} bought the ${planByTier(purchase.tier)?.name ?? purchase.tier} through your link — PKR ${purchase.affiliateCommission.toLocaleString()} was added to your money wallet.`,
          'affiliate'
        )
      }
      await notify(
        purchase.userId,
        'SYSTEM',
        `${planByTier(purchase.tier)?.name ?? purchase.tier} payment verified ✅`,
        'Your payment proof was approved — the plan is now active and the coins are yours to keep.',
        'plans'
      )

      return NextResponse.json({ ok: true, status: 'ACTIVE' })
    }

    // REJECT — claw back the coins granted at submission.
    await db.$transaction(async (tx) => {
      await tx.planPurchase.update({
        where: { id: purchase.id },
        data: { status: 'REJECTED', adminNote: note, decidedAt: new Date() },
      })
      await tx.user.update({
        where: { id: purchase.userId },
        data: { coins: { decrement: purchase.coinsGranted } },
      })
      await tx.coinTransaction.create({
        data: {
          userId: purchase.userId,
          amount: -purchase.coinsGranted,
          type: 'PLAN_CLAWBACK',
          description: `${planByTier(purchase.tier)?.name ?? purchase.tier} payment proof rejected — ${purchase.coinsGranted} coins deducted`,
        },
      })
    })
    rtWalletChanged([purchase.userId])
    await notify(
      purchase.userId,
      'SYSTEM',
      'Plan payment could not be verified',
      `The payment proof was rejected${note ? ` — ${note}` : ''} and the ${purchase.coinsGranted} coins were deducted. You can submit a new proof anytime.`,
      'plans'
    )

    return NextResponse.json({ ok: true, status: 'REJECTED' })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
