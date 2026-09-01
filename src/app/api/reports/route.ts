import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toReportDTO } from '@/lib/dto'
import { notify } from '@/lib/coins'

const REASONS = ['Spam', 'Scam or Fraud', 'Inappropriate Content', 'Copyright', 'Harassment', 'Misinformation', 'Other']
const TARGET_TYPES = ['CHAT', 'GOOD', 'COURSE', 'TUITION', 'USER']

/** Notify every admin that a new report arrived. */
async function notifyAdmins(reporterName: string) {
  try {
    const admins = await db.user.findMany({ where: { isAdmin: true, status: 'ACTIVE' }, select: { id: true } })
    await Promise.all(
      admins.map((a) =>
        notify(a.id, 'SYSTEM', 'New report submitted', `${reporterName} reported content — review it in the Admin Queue.`, 'admin')
      )
    )
  } catch {
    // notifications are best-effort
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)

    const targetType = body?.targetType as string
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 80) : ''
    const details = typeof body?.details === 'string' ? body.details.trim().slice(0, 1000) : undefined
    const targetId = typeof body?.targetId === 'string' ? body.targetId : undefined
    const targetUserId = typeof body?.targetUserId === 'string' ? body.targetUserId : undefined
    const connectionId = typeof body?.connectionId === 'string' ? body.connectionId : undefined

    if (!TARGET_TYPES.includes(targetType)) {
      return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 })
    }
    if (!reason || !REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Please pick a valid reason' }, { status: 400 })
    }

    // Validate the reported target actually exists (prevents junk queue entries)
    if (targetType === 'GOOD' && targetId) {
      const good = await db.digitalGood.findUnique({ where: { id: targetId } })
      if (!good) return NextResponse.json({ error: 'Reported item not found' }, { status: 404 })
    } else if (targetType === 'COURSE' && targetId) {
      const course = await db.course.findUnique({ where: { id: targetId } })
      if (!course) return NextResponse.json({ error: 'Reported course not found' }, { status: 404 })
    } else if (targetType === 'TUITION' && targetId) {
      const post = await db.tuitionPost.findUnique({ where: { id: targetId } })
      if (!post) return NextResponse.json({ error: 'Reported post not found' }, { status: 404 })
    } else if (targetType === 'CHAT' && connectionId) {
      const conn = await db.connection.findUnique({ where: { id: connectionId } })
      if (!conn) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (targetUserId) {
      const target = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
      if (!target) return NextResponse.json({ error: 'Reported user not found' }, { status: 404 })
    }
    if (targetUserId === me.id) {
      return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 })
    }

    const report = await db.report.create({
      data: {
        reporterId: me.id,
        targetType,
        targetId: targetId ?? null,
        targetUserId: targetUserId ?? null,
        connectionId: connectionId ?? null,
        reason,
        details: details || null,
      },
      include: { reporter: true, targetUser: true },
    })

    await notifyAdmins(me.name)
    return NextResponse.json({ report: toReportDTO(report as never) }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
