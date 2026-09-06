import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtWalletChanged } from '@/lib/realtime'

/** Approve / reject a teacher KYC submission (owner-only). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await ctx.params
    const body = await req.json().catch(() => null)
    const action = body?.action === 'APPROVE' ? 'APPROVE' : body?.action === 'REJECT' ? 'REJECT' : null
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined
    if (!action) return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 })

    const kyc = await db.kycSubmission.findUnique({ where: { id } })
    if (!kyc) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    if (kyc.status !== 'PENDING') return NextResponse.json({ error: 'Already decided' }, { status: 409 })

    const approved = action === 'APPROVE'
    await db.$transaction([
      db.kycSubmission.update({
        where: { id: kyc.id },
        data: { status: approved ? 'APPROVED' : 'REJECTED', adminNote: note, decidedAt: new Date() },
      }),
      db.user.update({ where: { id: kyc.userId }, data: { kycStatus: approved ? 'APPROVED' : 'REJECTED', isVerified: approved } }),
    ])

    await notify(
      kyc.userId,
      'SYSTEM',
      approved ? 'KYC approved ✓' : 'KYC rejected',
      approved
        ? 'Your identity is verified — the verified badge is now on your profile.'
        : `Your verification documents were rejected${note ? `: ${note}` : ''}. You can resubmit with clearer photos.`,
      'profile'
    )
    rtWalletChanged([kyc.userId])

    return NextResponse.json({ ok: true, status: approved ? 'APPROVED' : 'REJECTED' })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
