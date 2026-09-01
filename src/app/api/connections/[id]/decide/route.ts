import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify, refundPendingConnection } from '@/lib/coins'
import { toConnectionDTO } from '@/lib/dto'
import { rtEmit, RT_EVENTS, rtWalletChanged } from '@/lib/realtime'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const connection = await db.connection.findUnique({ where: { id } })
    if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

    const isMember = [connection.teacherId, connection.studentId, connection.payerId].includes(me.id)
    if (!isMember) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const action = body?.action as string
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : undefined

    // decider = the side that did NOT pay (student/parent for tuition flow, teacher for direct contact)
    const deciderId = connection.payerId === connection.teacherId ? connection.studentId : connection.teacherId
    const otherId = me.id === connection.teacherId ? connection.studentId : connection.teacherId

    if (action === 'HIRE') {
      if (me.id !== deciderId) return NextResponse.json({ error: 'Only the request receiver can hire' }, { status: 403 })
      if (!['PENDING', 'ACTIVE'].includes(connection.status)) {
        return NextResponse.json({ error: 'This request is already decided' }, { status: 409 })
      }

      await db.$transaction([
        db.connection.update({ where: { id }, data: { status: 'HIRED', decidedAt: new Date() } }),
        db.message.create({
          data: { connectionId: id, senderId: me.id, content: `🎉 ${me.name} hired this teacher. Conversation is now locked.`, system: true },
        }),
        ...(connection.tuitionPostId
          ? [db.tuitionPost.update({ where: { id: connection.tuitionPostId }, data: { status: 'HIRED' } })]
          : []),
      ])

      await notify(connection.teacherId, 'HIRED', 'You are hired! 🎉', `${me.name} hired you${connection.tuitionPostId ? ' for their tuition post' : ''}.`, 'chats')

      // Monetize reward for the teacher (platform keeps the spent coins)
      await db.coinTransaction.create({
        data: {
          userId: connection.teacherId,
          amount: Math.round(connection.coinsSpent / 2),
          type: 'HIRE_BONUS',
          description: `Monetize reward — hired for ${connection.coinsSpent} coins contact`,
          connectionId: id,
        },
      })
      await db.user.update({ where: { id: connection.teacherId }, data: { coins: { increment: Math.round(connection.coinsSpent / 2) } } })
    } else if (action === 'REJECT') {
      if (me.id !== deciderId) return NextResponse.json({ error: 'Only the request receiver can reject' }, { status: 403 })
      if (!['PENDING', 'ACTIVE'].includes(connection.status)) {
        return NextResponse.json({ error: 'This request is already decided' }, { status: 409 })
      }

      const chatStarted = Boolean(connection.chatStartedAt)
      let refundedNow = false

      if (!chatStarted) {
        // Rejected BEFORE any chat → coins go back to the payer
        const res = await refundPendingConnection(id, 'REJECTED')
        refundedNow = Boolean(res)
        await db.message.create({
          data: {
            connectionId: id,
            senderId: me.id,
            content: `❌ ${me.name} rejected this request before any chat — ${connection.coinsSpent} coins were refunded to the payer.`,
            system: true,
          },
        })
        await notify(otherId, 'REJECTED', 'Request rejected — coins refunded', `${me.name} rejected before chat started. Your ${connection.coinsSpent} coins were returned.`, 'chats')
      } else {
        // Rejected AFTER chat → no refund
        await db.$transaction([
          db.connection.update({ where: { id }, data: { status: 'REJECTED', decidedAt: new Date() } }),
          db.message.create({
            data: {
              connectionId: id,
              senderId: me.id,
              content: `❌ ${me.name} rejected this request after chatting — coins are not refunded.`,
              system: true,
            },
          }),
        ])
        await notify(otherId, 'REJECTED', 'Request rejected', `${me.name} rejected after chat — no coin refund per policy.`, 'chats')
      }

      const updated = await db.connection.findUnique({ where: { id }, include: { teacher: true, student: true, tuitionPost: { select: { id: true, title: true, coinCost: true } } } })
      // Realtime: both parties refresh their thread + chat list
      rtEmit(RT_EVENTS.chatUpdated, { connectionId: id, action }, {
        userIds: [connection.teacherId, connection.studentId],
      })
      if (refundedNow) rtWalletChanged([connection.payerId || connection.teacherId])
      return NextResponse.json({ connection: toConnectionDTO(updated as never, me.id), refunded: refundedNow })
    } else if (action === 'BLOCK') {
      if (connection.blockedBy) return NextResponse.json({ error: 'Already blocked' }, { status: 409 })

      await db.$transaction([
        db.block.upsert({
          where: { blockerId_blockedId: { blockerId: me.id, blockedId: otherId } },
          update: {},
          create: { blockerId: me.id, blockedId: otherId },
        }),
        db.connection.update({ where: { id }, data: { blockedBy: me.id } }),
        db.message.create({
          data: { connectionId: id, senderId: me.id, content: `🚫 ${me.name} blocked the other participant. Conversation closed.`, system: true },
        }),
      ])
      await notify(otherId, 'BLOCK', 'You were blocked', `${me.name} blocked you on StudySir.`)
    } else if (action === 'UNBLOCK') {
      if (connection.blockedBy !== me.id) return NextResponse.json({ error: 'Only the blocker can unblock' }, { status: 403 })

      await db.$transaction([
        db.block.deleteMany({ where: { blockerId: me.id, blockedId: otherId } }),
        db.connection.update({ where: { id }, data: { blockedBy: null } }),
        db.message.create({
          data: { connectionId: id, senderId: me.id, content: `✅ ${me.name} unblocked the other participant.`, system: true },
        }),
      ])
    } else if (action === 'REPORT') {
      await db.message.create({
        data: {
          connectionId: id,
          senderId: me.id,
          content: `📣 ${me.name} reported this conversation${reason ? `: "${reason}"` : '.'} Our team will review it.`,
          system: true,
        },
      })
      await notify(otherId, 'SYSTEM', 'Conversation reported', 'A report was submitted on this conversation.')
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updated = await db.connection.findUnique({
      where: { id },
      include: { teacher: true, student: true, tuitionPost: { select: { id: true, title: true, coinCost: true } } },
    })

    // Realtime: both parties refresh their thread + chat list
    rtEmit(RT_EVENTS.chatUpdated, { connectionId: id, action }, {
      userIds: [connection.teacherId, connection.studentId],
    })
    // Realtime: wallet badges after hire bonus / refunds
    if (action === 'HIRE') rtWalletChanged([connection.teacherId, connection.studentId])
    if (action === 'REJECT' && refundedNow) rtWalletChanged([connection.payerId || connection.teacherId])

    return NextResponse.json({ connection: toConnectionDTO(updated as never, me.id), refunded: false })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
