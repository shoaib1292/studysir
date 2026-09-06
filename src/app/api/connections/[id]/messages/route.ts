import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { rtEmit, RT_EVENTS } from '@/lib/realtime'
import { toMessageDTO } from '@/lib/dto'
import { onMessageToAI } from '@/lib/ai'

const LOCKED = ['HIRED', 'REJECTED', 'EXPIRED']
// data-URL size guard (~700KB ≈ 525KB binary after base64 overhead)
const MAX_IMAGE_CHARS = 700_000

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const connection = await db.connection.findUnique({ where: { id } })
    if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

    const isMember = [connection.teacherId, connection.studentId, connection.payerId].includes(me.id)
    if (!isMember) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    if (LOCKED.includes(connection.status)) {
      return NextResponse.json(
        { error: 'This conversation is locked — the request was already decided.' },
        { status: 423 }
      )
    }
    if (connection.status === 'PENDING') {
      // Chat unlocks when the TEACHER accepts the request (and pays coins).
      return NextResponse.json(
        { error: 'Chat unlocks when the teacher accepts this request.' },
        { status: 423 }
      )
    }
    if (connection.blockedBy) {
      const blockedByMe = connection.blockedBy === me.id
      return NextResponse.json(
        { error: blockedByMe ? 'You blocked this user — unblock to chat again.' : 'You are blocked in this conversation.' },
        { status: 423 }
      )
    }

    const body = await req.json().catch(() => null)
    const content = typeof body?.content === 'string' ? body.content.trim() : ''
    const image = typeof body?.image === 'string' ? body.image : ''

    if (!content && !image) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    if (image) {
      if (!image.startsWith('data:image/') || image.length > MAX_IMAGE_CHARS) {
        return NextResponse.json({ error: 'Image too large (max ~500KB) or invalid format' }, { status: 400 })
      }
    }

    // The "decider" is the side that did NOT pay (student for tuition flow, teacher for direct contact).
    // Chat officially starts when the decider replies — until then the refund window keeps running.
    const deciderId = connection.payerId === connection.teacherId ? connection.studentId : connection.teacherId
    const deciderReplied = !connection.chatStartedAt && me.id === deciderId

    const [message] = await db.$transaction([
      db.message.create({
        data: {
          connectionId: id,
          senderId: me.id,
          content: content.slice(0, 2000) || (image ? '📷 Photo' : ''),
          image: image || null,
        },
        include: { sender: true },
      }),
      db.connection.update({
        where: { id },
        data: {
          chatStartedAt: deciderReplied ? new Date() : connection.chatStartedAt,
          status: deciderReplied && connection.status === 'PENDING' ? 'ACTIVE' : connection.status,
        },
      }),
    ])

    const recipient = me.id === connection.teacherId ? connection.studentId : connection.teacherId
    await notify(recipient, 'MESSAGE', `New message from ${me.name}`, image && !content ? '📷 Sent a photo' : content.slice(0, 80), 'chats')

    // AI hook: if the other side is an AI agent, schedule a humanlike reply
    onMessageToAI(id).catch(() => null)

    // Realtime: push the new message to both parties (thread + chat list)
    const messageDTO = toMessageDTO(message as never)
    rtEmit(RT_EVENTS.chatMessage, { connectionId: id, message: messageDTO }, {
      userIds: [connection.teacherId, connection.studentId],
    })

    return NextResponse.json({ message: messageDTO }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
