import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser } from '@/lib/session'
import { hasModuleAccess } from '@/lib/permissions'
import { rtEmit, RT_EVENTS } from '@/lib/realtime'

/**
 * POST /api/admin/moderation/[id]  body: { action: 'APPROVE' | 'REJECT', note? }
 *
 * Approving a flagged item sets its content's moderationStatus = APPROVED so it
 * appears in feeds / chats. Rejecting sets moderationStatus = REJECTED (hidden)
 * and, for messages, the placeholder stays. Either way the ModerationItem is closed.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser()
    if (!hasModuleAccess(admin, 'moderation')) {
      return NextResponse.json({ error: 'No access to moderation queue' }, { status: 403 })
    }
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const action = body.action === 'REJECT' ? 'REJECTED' : 'APPROVED'
    const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null

    const item = await db.moderationItem.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: 'Moderation item not found' }, { status: 404 })
    if (item.status !== 'PENDING') {
      return NextResponse.json({ error: 'This item was already reviewed' }, { status: 409 })
    }

    const newContentStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED'

    // Update the ModerationItem
    await db.moderationItem.update({
      where: { id },
      data: { status: action, adminNote: note, decidedBy: admin.id, decidedAt: new Date() },
    })

    // Update the underlying content's moderationStatus so the feed / chat reflects it.
    const target = item.targetType
    if (target === 'TUITION') {
      await db.tuitionPost.updateMany({ where: { id: item.targetId }, data: { moderationStatus: newContentStatus } })
    } else if (target === 'COURSE') {
      await db.course.updateMany({ where: { id: item.targetId }, data: { moderationStatus: newContentStatus } })
    } else if (target === 'GOOD') {
      await db.digitalGood.updateMany({ where: { id: item.targetId }, data: { moderationStatus: newContentStatus } })
    } else if (target === 'SHARED') {
      await db.sharedPost.updateMany({ where: { id: item.targetId }, data: { moderationStatus: newContentStatus } })
    } else if (target === 'MESSAGE') {
      const msg = await db.message.updateMany({ where: { id: item.targetId }, data: { moderationStatus: newContentStatus } })
      if (msg.count > 0) {
        // Push a realtime update so the chat thread re-renders the (now approved) message.
        const m = await db.message.findUnique({ where: { id: item.targetId }, select: { connectionId: true } })
        if (m) {
          const conn = await db.connection.findUnique({ where: { id: m.connectionId }, select: { teacherId: true, studentId: true } })
          if (conn) rtEmit(RT_EVENTS.chatUpdated, { connectionId: m.connectionId, action: 'MODERATION' }, { userIds: [conn.teacherId, conn.studentId] })
        }
      }
    }

    return NextResponse.json({ ok: true, status: action })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
