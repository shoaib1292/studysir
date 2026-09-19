import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toGoodDTO } from '@/lib/dto'
import { scanContent, blockReason, excerpt, MODERATION_REASONS, MODERATION_STATUS } from '@/lib/moderation'

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

    // Content moderation: block direct contact info; send description links to review.
    // (The seller's own accessLink is allowed — it's the download URL, stored separately.)
    const moderationText = [body.title, body.description].join(' ')
    const scan = scanContent(moderationText)
    const blocked = blockReason(scan)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 })
    const moderationStatus = scan.hasUnapprovedLink ? MODERATION_STATUS.PENDING : MODERATION_STATUS.APPROVED

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
        moderationStatus,
      },
      include: { seller: true },
    })

    if (moderationStatus === MODERATION_STATUS.PENDING) {
      await db.moderationItem.create({
        data: {
          targetType: 'GOOD',
          targetId: good.id,
          authorId: me.id,
          reason: MODERATION_REASONS.UNAPPROVED_LINK,
          snippet: excerpt(moderationText, scan.linkMatches),
        },
      })
      return NextResponse.json({ good: await toGoodDTO(good, me.id), moderation: 'PENDING' }, { status: 201 })
    }

    return NextResponse.json({ good: await toGoodDTO(good, me.id) }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
