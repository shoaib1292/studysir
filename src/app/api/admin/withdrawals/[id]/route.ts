import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'

/** Approve (mark paid) / reject a withdrawal request (owner-only). REJECT refunds the held money. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const action = body?.action === 'APPROVE' ? 'APPROVE' : body?.action === 'REJECT' ? 'REJECT' : null
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined
    if (!action) return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 })

    const wr = await db.withdrawRequest.findUnique({ where: { id } })
    if (!wr) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    if (wr.status !== 'PENDING') return NextResponse.json({ error: 'Already decided' }, { status: 409 })

    const approved = action === 'APPROVE'
    await db.$transaction(async (tx) => {
      await tx.withdrawRequest.update({
        where: { id: wr.id },
        data: { status: approved ? 'APPROVED' : 'REJECTED', adminNote: note, decidedAt: new Date() },
      })
      if (approved) {
        await tx.coinTransaction.create({
          data: { userId: wr.userId, amount: 0, type: 'WITHDRAW_PAID', description: `Withdrawal paid — PKR ${wr.amount} sent to ${wr.bankName} ${wr.accountNumber}` },
        })
      } else {
        await tx.user.update({ where: { id: wr.userId }, data: { money: { increment: wr.amount } } })
        await tx.coinTransaction.create({
          data: { userId: wr.userId, amount: 0, type: 'WITHDRAW_REFUND', description: `Withdrawal rejected — PKR ${wr.amount} returned to wallet${note ? ` (${note})` : ''}` },
        })
      }
    })

    await notify(
      wr.userId,
      'SYSTEM',
      approved ? 'Withdrawal paid' : 'Withdrawal rejected',
      approved
        ? `PKR ${wr.amount} has been delivered to ${wr.bankName} — account ${wr.accountNumber}.`
        : `Your withdrawal of PKR ${wr.amount} was rejected${note ? `: ${note}` : ''} — the money is back in your wallet.`,
      'wallet'
    )
    rtWalletChanged([wr.userId])

    return NextResponse.json({ ok: true, status: approved ? 'APPROVED' : 'REJECTED' })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
