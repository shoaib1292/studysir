import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { rtEmit, RT_EVENTS } from '@/lib/realtime'

/**
 * DELETE /api/messages/:id
 * Messenger-style "unsend": only the sender can unsend a non-system message.
 * Soft-delete (deletedAt) — the row stays for moderation, but clients receive
 * an "unsent" placeholder and never the original content/image.
 * Emits realtime `chat:delete` to both parties (sender first for instant UX).
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const message = await db.message.findUnique({
      where: { id },
      include: { connection: { select: { teacherId: true, studentId: true } } },
    })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const conn = message.connection
    const isMember = [conn.teacherId, conn.studentId].includes(me.id)
    if (!isMember) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    if (message.system) {
      return NextResponse.json({ error: 'System messages cannot be unsent.' }, { status: 400 })
    }
    if (message.senderId !== me.id) {
      return NextResponse.json({ error: 'You can only unsend your own messages.' }, { status: 403 })
    }
    if (message.deletedAt) {
      return NextResponse.json({ ok: true }) // already unsent — idempotent
    }

    const deletedAt = new Date()
    await db.message.update({ where: { id }, data: { deletedAt } })

    rtEmit(
      RT_EVENTS.chatDelete,
      { connectionId: message.connectionId, messageId: id, deletedAt: deletedAt.toISOString(), senderId: me.id },
      { userIds: [conn.teacherId, conn.studentId] }
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
