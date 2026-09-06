import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'

/** PATCH (edit / toggle active) or DELETE a platform bank account (owner-only). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const data: Record<string, unknown> = {}
    if (typeof body?.bankName === 'string') data.bankName = body.bankName.trim().slice(0, 120)
    if (typeof body?.accountTitle === 'string') data.accountTitle = body.accountTitle.trim().slice(0, 120)
    if (typeof body?.accountNumber === 'string') data.accountNumber = body.accountNumber.trim().slice(0, 60)
    if (typeof body?.instructions === 'string') data.instructions = body.instructions.trim().slice(0, 500)
    if (typeof body?.active === 'boolean') data.active = body.active
    const account = await db.platformBankAccount.update({ where: { id }, data })
    return NextResponse.json({ account })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await ctx.params
    await db.platformBankAccount.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
