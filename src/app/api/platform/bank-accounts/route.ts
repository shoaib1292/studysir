import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** Public list of active platform bank/wallet accounts shown on payment dialogs. */
export async function GET() {
  try {
    const accounts = await db.platformBankAccount.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, bankName: true, accountTitle: true, accountNumber: true, instructions: true },
    })
    return NextResponse.json({ accounts })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
