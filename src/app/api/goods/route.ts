import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toGoodDTO } from '@/lib/dto'

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    if (me.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can sell digital goods' }, { status: 403 })
    }
    const body = await req.json().catch(() => null)
    if (!body?.title || !body?.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }
    const price = Number(body.price) || 0
    const assetType = body.assetType === 'link' ? 'link' : 'file'

    if (assetType === 'file' && !body.fileUrl) {
      return NextResponse.json({ error: 'Please upload a digital asset file' }, { status: 400 })
    }
    if (assetType === 'link') {
      const link = String(body.accessLink || '').trim()
      if (!link) return NextResponse.json({ error: 'Please provide an access link' }, { status: 400 })
      if (!/^https?:\/\//i.test(link)) return NextResponse.json({ error: 'Access link must start with http:// or https://' }, { status: 400 })
    }

    const good = await db.digitalGood.create({
      data: {
        sellerId: me.id,
        title: String(body.title).slice(0, 200),
        description: String(body.description).slice(0, 2000),
        image: body.image ? String(body.image) : null,
        assetType,
        accessLink: assetType === 'link' ? String(body.accessLink).trim() : null,
        price,
        fileUrl: assetType === 'file' && body.fileUrl ? String(body.fileUrl) : null,
      },
      include: { seller: true },
    })

    return NextResponse.json({ good: await toGoodDTO(good, me.id) }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
