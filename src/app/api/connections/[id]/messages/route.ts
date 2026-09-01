import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'
import { toMessageDTO } from '@/lib/dto'

const LOCKED = ['HIRED', 'REJECTED', 'EXPIRED']

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
    if (connection.blockedBy) {
      const blockedByMe = connection.blockedBy === me.id
      return NextResponse.json(
        { error: blockedByMe ? 'You blocked this user — unblock to chat again.' : 'You are blocked in this conversation.' },
        { status: 423 }
      )
    }

    const body = await req.json().catch(() => null)
    const content = body?.content as string | undefined
    if (!content || !content.trim()) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })

    // The "decider" is the side that did NOT pay (student for tuition flow, teacher for direct contact).
    // Chat officially starts when the decider replies — until then the refund window keeps running.
    const deciderId = connection.payerId === connection.teacherId ? connection.studentId : connection.teacherId
    const deciderReplied = !connection.chatStartedAt && me.id === deciderId

    const [message] = await db.$transaction([
      db.message.create({
        data: { connectionId: id, senderId: me.id, content: content.trim().slice(0, 2000) },
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
    await notify(recipient, 'MESSAGE', `New message from ${me.name}`, content.trim().slice(0, 80), 'chats')

    return NextResponse.json({ message: toMessageDTO(message as never) }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
