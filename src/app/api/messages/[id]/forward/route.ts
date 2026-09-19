import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtEmit, RT_EVENTS } from '@/lib/realtime'
import { toMessageDTO } from '@/lib/dto'

const LOCKED = ['HIRED', 'REJECTED', 'EXPIRED']

/**
 * POST /api/messages/:id/forward  { connectionId }
 * Messenger-style forwarding: copy an existing message (text + photo) into
 * another chat the viewer belongs to. The copy is marked `forwarded` so every
 * client renders a "Forwarded" label. Server-side rules:
 *  - viewer must be able to READ the source message (member of its chat)
 *  - source must not be unsent / system
 *  - target chat must be open (not locked / not blocked) for the viewer
 *  - forwarding into a PENDING chat as the decider starts the chat (same as replying)
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const body = await req.json().catch(() => null)
    const targetConnectionId = typeof body?.connectionId === 'string' ? body.connectionId : ''
    if (!targetConnectionId) {
      return NextResponse.json({ error: 'Missing target connectionId' }, { status: 400 })
    }

    // ---- source message + read permission ----
    const source = await db.message.findUnique({
      where: { id },
      include: { connection: { select: { teacherId: true, studentId: true } } },
    })
    if (!source) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    if (source.system) {
      return NextResponse.json({ error: 'System messages cannot be forwarded.' }, { status: 400 })
    }
    if (source.deletedAt) {
      return NextResponse.json({ error: 'This message was unsent.' }, { status: 400 })
    }
    const srcConn = source.connection
    const canReadSource = [srcConn.teacherId, srcConn.studentId].includes(me.id)
    if (!canReadSource) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    // ---- target chat + send permission (same rules as sending) ----
    const target = await db.connection.findUnique({ where: { id: targetConnectionId } })
    if (!target) return NextResponse.json({ error: 'Target chat not found' }, { status: 404 })
    const isMember = [target.teacherId, target.studentId].includes(me.id)
    if (!isMember) return NextResponse.json({ error: 'You are not part of that chat' }, { status: 403 })
    if (LOCKED.includes(target.status)) {
      return NextResponse.json(
        { error: 'That conversation is locked — the request was already decided.' },
        { status: 423 }
      )
    }
    if (target.blockedBy) {
      const blockedByMe = target.blockedBy === me.id
      return NextResponse.json(
        { error: blockedByMe ? 'You blocked this user — unblock to forward.' : 'You are blocked in that conversation.' },
        { status: 423 }
      )
    }
    if (target.id === source.connectionId) {
      return NextResponse.json({ error: 'Pick a different chat to forward to.' }, { status: 400 })
    }

    // The "decider" is the side that did NOT pay (same rule as normal sending).
    const deciderId = target.payerId === target.teacherId ? target.studentId : target.teacherId
    const deciderReplied = !target.chatStartedAt && me.id === deciderId

    const [message] = await db.$transaction([
      db.message.create({
        data: {
          connectionId: target.id,
          senderId: me.id,
          content: source.content.slice(0, 2000),
          image: source.image,
          forwarded: true,
        },
        include: { sender: true },
      }),
      db.connection.update({
        where: { id: target.id },
        data: {
          chatStartedAt: deciderReplied ? new Date() : target.chatStartedAt,
          status: deciderReplied && target.status === 'PENDING' ? 'ACTIVE' : target.status,
        },
      }),
    ])

    const recipient = me.id === target.teacherId ? target.studentId : target.teacherId
    await notify(
      recipient,
      'MESSAGE',
      `New message from ${me.name}`,
      source.image && !source.content ? '📷 Forwarded a photo' : `Forwarded: ${source.content.slice(0, 70)}`,
      'chats'
    )

    const messageDTO = toMessageDTO(message as never)
    rtEmit(RT_EVENTS.chatMessage, { connectionId: target.id, message: messageDTO }, {
      userIds: [target.teacherId, target.studentId],
    })

    return NextResponse.json({ message: messageDTO }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
