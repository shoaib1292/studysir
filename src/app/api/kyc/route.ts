import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'

/** Teacher KYC (requirement E) — read my submission. */
export async function GET() {
  try {
    const me = await requireSessionUser()
    const kyc = await db.kycSubmission.findUnique({ where: { userId: me.id } })
    return NextResponse.json({
      kyc: kyc
        ? {
            id: kyc.id,
            status: kyc.status,
            fullName: kyc.fullName,
            city: kyc.city,
            adminNote: kyc.adminNote,
            decidedAt: kyc.decidedAt?.toISOString() ?? null,
            createdAt: kyc.createdAt.toISOString(),
          }
        : null,
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** Submit / resubmit KYC documents (teachers only). */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    if (me.role !== 'TEACHER') {
      return NextResponse.json({ error: 'KYC is for teacher accounts' }, { status: 403 })
    }
    if (me.kycStatus === 'PENDING') {
      return NextResponse.json({ error: 'Your KYC is already under review' }, { status: 409 })
    }
    const body = await req.json().catch(() => null)
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 120) : ''
    const cnic = typeof body?.cnic === 'string' ? body.cnic.trim().slice(0, 30) : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 30) : ''
    const city = typeof body?.city === 'string' ? body.city.trim().slice(0, 80) : ''
    const documentImage = typeof body?.documentImage === 'string' ? body.documentImage : ''
    const selfieImage = typeof body?.selfieImage === 'string' && body.selfieImage.startsWith('data:image/') ? body.selfieImage : null

    if (!fullName || !cnic || !phone || !city) {
      return NextResponse.json({ error: 'Full name, CNIC, phone and city are required' }, { status: 400 })
    }
    if (!documentImage.startsWith('data:image/')) {
      return NextResponse.json({ error: 'A photo of your CNIC / ID document is required' }, { status: 400 })
    }

    const kyc = await db.kycSubmission.upsert({
      where: { userId: me.id },
      create: { userId: me.id, fullName, cnic, phone, city, documentImage, selfieImage },
      update: { fullName, cnic, phone, city, documentImage, selfieImage, status: 'PENDING', adminNote: null, decidedAt: null },
    })
    await db.user.update({ where: { id: me.id }, data: { kycStatus: 'PENDING' } })

    await notify(me.id, 'SYSTEM', 'KYC submitted', 'Your verification documents are under review.')

    return NextResponse.json({ kyc: { id: kyc.id, status: kyc.status } }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
