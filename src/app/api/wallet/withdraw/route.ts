import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'
import { MIN_WITHDRAW_PKR } from '@/lib/currency'

/**
 * Withdrawal request (requirement B) — minimum 1,000 PKR, requires saved bank
 * details (account number, account title, bank name). The amount is held
 * (deducted) immediately; if an admin rejects it, the money is refunded.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const amount = Math.round(Number(body?.amount))
    const bankName = typeof body?.bankName === 'string' ? body.bankName.trim().slice(0, 120) : ''
    const accountTitle = typeof body?.accountTitle === 'string' ? body.accountTitle.trim().slice(0, 120) : ''
    const accountNumber = typeof body?.accountNumber === 'string' ? body.accountNumber.trim().slice(0, 60) : ''

    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_PKR) {
      return NextResponse.json({ error: `Minimum withdrawal is PKR ${MIN_WITHDRAW_PKR.toLocaleString()}` }, { status: 400 })
    }
    if (!bankName || !accountTitle || !accountNumber) {
      return NextResponse.json({ error: 'Bank name, account title and account number are required' }, { status: 400 })
    }
    if (me.money < amount) {
      return NextResponse.json({ error: `Insufficient balance — you have PKR ${me.money.toFixed(0)}` }, { status: 402 })
    }
    const pending = await db.withdrawRequest.findFirst({ where: { userId: me.id, status: 'PENDING' } })
    if (pending) {
      return NextResponse.json({ error: 'You already have a pending withdrawal request' }, { status: 409 })
    }

    const wr = await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: me.id }, data: { money: { decrement: amount } } })
      await tx.coinTransaction.create({
        data: { userId: me.id, amount: 0, type: 'WITHDRAW_HOLD', description: `Withdrawal requested — PKR ${amount} sent for review` },
      })
      return tx.withdrawRequest.create({
        data: { userId: me.id, amount, bankName, accountTitle, accountNumber },
      })
    })

    // persist the bank details for next time
    await db.user.update({
      where: { id: me.id },
      data: { bankName, bankAccountTitle: accountTitle, bankAccountNumber: accountNumber },
    })

    await notify(me.id, 'SYSTEM', 'Withdrawal requested', `PKR ${amount} is under review — we deliver withdrawals manually to ${bankName}.`, 'wallet')
    rtWalletChanged([me.id])

    return NextResponse.json({ withdrawal: { id: wr.id, status: wr.status, amount: wr.amount } }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
