import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'

/**
 * Approve / reject a payment-proof top-up (owner-only).
 * - TEACHER_COINS: coins were credited instantly — REJECT claws them back.
 * - STUDENT_MONEY: APPROVE credits the wallet money now.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const action = body?.action === 'APPROVE' ? 'APPROVE' : body?.action === 'REJECT' ? 'REJECT' : null
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined
    if (!action) return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 })

    const topup = await db.topUpRequest.findUnique({ where: { id }, include: { user: true } })
    if (!topup) return NextResponse.json({ error: 'Top-up not found' }, { status: 404 })
    if (topup.status !== 'PENDING') return NextResponse.json({ error: 'Already decided' }, { status: 409 })

    const approved = action === 'APPROVE'
    await db.$transaction(async (tx) => {
      await tx.topUpRequest.update({ where: { id: topup.id }, data: { status: approved ? 'APPROVED' : 'REJECTED', adminNote: note, decidedAt: new Date() } })
      if (topup.kind === 'TEACHER_COINS') {
        if (approved) {
          await tx.coinTransaction.create({
            data: { userId: topup.userId, amount: 0, type: 'TOPUP_VERIFIED', description: `Payment verified — ${topup.coinsGranted} coins confirmed (PKR ${topup.amount})` },
          })
        } else {
          // clawback the instantly-granted coins
          await tx.user.update({ where: { id: topup.userId }, data: { coins: { decrement: topup.coinsGranted } } })
          await tx.coinTransaction.create({
            data: { userId: topup.userId, amount: -topup.coinsGranted, type: 'TOPUP_REVERSED', description: `Payment proof rejected — ${topup.coinsGranted} coins deducted${note ? ` (${note})` : ''}` },
          })
        }
      } else if (approved) {
        await tx.user.update({ where: { id: topup.userId }, data: { money: { increment: topup.amount } } })
        await tx.coinTransaction.create({
          data: { userId: topup.userId, amount: 0, type: 'MONEY_ADD', description: `Wallet topped up — PKR ${topup.amount} verified from payment proof` },
        })
      }
    })

    await notify(
      topup.userId,
      'SYSTEM',
      approved
        ? topup.kind === 'TEACHER_COINS'
          ? `Payment verified — ${topup.coinsGranted} coins confirmed`
          : `PKR ${topup.amount} added to your wallet`
        : 'Payment proof rejected',
      approved
        ? 'Your payment screenshot passed verification.'
        : `Your payment proof of PKR ${topup.amount} could not be verified${note ? `: ${note}` : ''}.`,
      'wallet'
    )
    rtWalletChanged([topup.userId])

    return NextResponse.json({ ok: true, status: approved ? 'APPROVED' : 'REJECTED' })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
