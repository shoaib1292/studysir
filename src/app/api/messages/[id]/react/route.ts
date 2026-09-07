import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { rtEmit, RT_EVENTS } from '@/lib/realtime'

/** Allowed quick reactions (Facebook-style set). */
const ALLOWED = ['👍', '❤️', '😂', '😮', '😢', '👎']

/**
 * POST /api/messages/:id/react { emoji }
 * Toggle a reaction on a chat message: same emoji again removes it,
 * a different emoji switches, none adds one. Emits realtime to both parties.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const message = await db.message.findUnique({
      where: { id },
      include: { connection: { select: { teacherId: true, studentId: true, blockedBy: true } } },
    })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const conn = message.connection
    const isMember = [conn.teacherId, conn.studentId].includes(me.id)
    if (!isMember) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    // A blocked conversation is frozen for both sides — reactions included.
    if (conn.blockedBy) {
      return NextResponse.json({ error: 'This conversation is blocked.' }, { status: 423 })
    }
    if (message.system) {
      return NextResponse.json({ error: 'System messages cannot be reacted to.' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    const emoji = typeof body?.emoji === 'string' ? body.emoji : ''
    if (!ALLOWED.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
    }

    const existing = await db.reaction.findUnique({
      where: { messageId_userId: { messageId: id, userId: me.id } },
    })

    let action: 'added' | 'changed' | 'removed'
    if (!existing) {
      await db.reaction.create({ data: { messageId: id, userId: me.id, emoji } })
      action = 'added'
    } else if (existing.emoji === emoji) {
      await db.reaction.delete({ where: { id: existing.id } })
      action = 'removed'
    } else {
      await db.reaction.update({ where: { id: existing.id }, data: { emoji } })
      action = 'changed'
    }

    // Fresh aggregated snapshot for everyone in the chat
    const rows = await db.reaction.findMany({ where: { messageId: id }, select: { emoji: true, userId: true } })
    const groups = new Map<string, string[]>()
    for (const r of rows) {
      const arr = groups.get(r.emoji) ?? []
      arr.push(r.userId)
      groups.set(r.emoji, arr)
    }
    const reactions = [...groups.entries()].map(([e, userIds]) => ({ emoji: e, count: userIds.length, userIds }))

    rtEmit(RT_EVENTS.chatReaction, { connectionId: message.connectionId, messageId: id, reactions }, {
      userIds: [conn.teacherId, conn.studentId],
    })

    return NextResponse.json({ reactions, action })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
