import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

export async function GET() {
  try {
    const me = await requireSessionUser()
    const [transactions, topups, withdrawals] = await Promise.all([
      db.coinTransaction.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
      db.topUpRequest.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
      db.withdrawRequest.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ])
    return NextResponse.json({
      coins: me.coins,
      money: me.money,
      bankDetails: {
        bankName: me.bankName,
        accountTitle: me.bankAccountTitle,
        accountNumber: me.bankAccountNumber,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
      topups: topups.map((t) => ({
        id: t.id,
        kind: t.kind,
        amount: t.amount,
        method: t.method,
        coinsGranted: t.coinsGranted,
        status: t.status,
        adminNote: t.adminNote,
        createdAt: t.createdAt.toISOString(),
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        bankName: w.bankName,
        accountTitle: w.accountTitle,
        accountNumber: w.accountNumber,
        status: w.status,
        adminNote: w.adminNote,
        createdAt: w.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
