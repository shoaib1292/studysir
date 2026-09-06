import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'

/** GET all platform bank/wallet accounts (admin). */
export async function GET() {
  try {
    await requireAdminUser()
    const accounts = await db.platformBankAccount.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ accounts })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** POST add an account (owner-only). */
export async function POST(req: NextRequest) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const body = await req.json().catch(() => null)
    const bankName = typeof body?.bankName === 'string' ? body.bankName.trim().slice(0, 120) : ''
    const accountTitle = typeof body?.accountTitle === 'string' ? body.accountTitle.trim().slice(0, 120) : ''
    const accountNumber = typeof body?.accountNumber === 'string' ? body.accountNumber.trim().slice(0, 60) : ''
    const instructions = typeof body?.instructions === 'string' ? body.instructions.trim().slice(0, 500) : null
    if (!bankName || !accountTitle || !accountNumber) {
      return NextResponse.json({ error: 'Bank name, account title and account number are required' }, { status: 400 })
    }
    const account = await db.platformBankAccount.create({ data: { bankName, accountTitle, accountNumber, instructions } })
    return NextResponse.json({ account }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
