import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toConnectionDTO, toMessageDTO } from '@/lib/dto'
import { rtEmit, RT_EVENTS } from '@/lib/realtime'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const connection = await db.connection.findUnique({
      where: { id },
      include: { teacher: true, student: true, tuitionPost: { select: { id: true, title: true, coinCost: true } } },
    })
    if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

    const isMember = [connection.teacherId, connection.studentId, connection.payerId].includes(me.id)
    if (!isMember) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    // Snapshot unseen incoming messages BEFORE marking read (drives the "new messages" divider)
    const unseen = await db.message.findMany({
      where: { connectionId: id, senderId: { not: me.id }, readAt: null, system: false, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })

    // Mark incoming messages as read
    const marked = await db.message.updateMany({
      where: { connectionId: id, senderId: { not: me.id }, readAt: null },
      data: { readAt: new Date() },
    })
    // Realtime: let the other party know their messages were read (read receipts)
    if (marked.count > 0) {
      const otherId = [connection.teacherId, connection.studentId].find((uid) => uid !== me.id)
      rtEmit(RT_EVENTS.chatRead, { connectionId: id, readerId: me.id }, { userIds: otherId ? [otherId] : [] })
    }

    const messages = await db.message.findMany({
      where: { connectionId: id },
      orderBy: { createdAt: 'asc' },
      include: { sender: true, reactions: { select: { emoji: true, userId: true } } },
    })

    return NextResponse.json({
      connection: toConnectionDTO(connection as never, me.id, null, unseen.length),
      messages: messages.map((m) => toMessageDTO(m as never)),
      unread: unseen.length > 0 ? { count: unseen.length, firstId: unseen[0].id } : null,
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
