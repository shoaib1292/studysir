import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify, refundPendingConnection } from '@/lib/coins'
import { toConnectionDTO } from '@/lib/dto'
import { rtEmit, RT_EVENTS, rtWalletChanged } from '@/lib/realtime'
import { scheduleAIOnNewRequest } from '@/lib/ai'

/**
 * Connection decisions — NEW coin model:
 *  - ACCEPT (TEACHER, on PENDING): teacher pays coins → chat unlocks (ACTIVE).
 *    The UI shows "Accepting will deduct X coins" BEFORE calling this.
 *  - HIRE   (STUDENT/PARENT, on ACTIVE): student hires the teacher. Platform
 *    keeps the teacher's coins; teacher gets a monetize reward.
 *  - REJECT (STUDENT/PARENT):
 *      · while PENDING → free (nobody paid), status REJECTED.
 *      · after ACCEPT but before the student sent any real message → teacher
 *        is refunded automatically.
 *      · after chatting → no refund per policy.
 *  - BLOCK / UNBLOCK / REPORT unchanged.
 */
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

    const otherId = me.id === connection.teacherId ? connection.studentId : connection.teacherId
    let refundedNow = false

    if (action === 'ACCEPT') {
      // Only the TEACHER accepts a pending request, and it costs coins
      if (me.id !== connection.teacherId) {
        return NextResponse.json({ error: 'Only the teacher can accept this request' }, { status: 403 })
      }
      if (connection.status !== 'PENDING') {
        return NextResponse.json({ error: 'This request is not pending' }, { status: 409 })
      }
      const cost = connection.coinsSpent || 10
      if (me.coins < cost) {
        return NextResponse.json(
          { error: `Not enough coins — accepting costs ${cost} coins, you have ${me.coins}` },
          { status: 402 }
        )
      }

      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: me.id }, data: { coins: { decrement: cost } } })
        await tx.coinTransaction.create({
          data: {
            userId: me.id,
            amount: -cost,
            type: 'SPEND_CONTACT',
            description: `Accepted request from ${me.name === connection.teacherId ? 'student' : 'student'} (Connection ${id.slice(-6)})`,
            connectionId: id,
          },
        })
        await tx.connection.update({
          where: { id },
          data: { status: 'ACTIVE', coinsSpent: cost, payerId: me.id, chatStartedAt: new Date() },
        })
        await tx.message.create({
          data: {
            connectionId: id,
            senderId: me.id,
            content: `🤝 ${me.name} accepted the request (${cost} coins). Chat is now open.`,
            system: true,
          },
        })
        if (connection.tuitionPostId) {
          await tx.tuitionPost.update({ where: { id: connection.tuitionPostId }, data: { status: 'ACTIVE' } })
        }
      })

      await notify(connection.studentId, 'CONNECT_REQUEST', `${me.name} accepted your request`, 'Chat is now open — say salam!', 'chats')
      // AI hook: AI student should start chatting once its request is accepted
      scheduleAIOnNewRequest(id).catch(() => null)
      rtWalletChanged([me.id])
    } else if (action === 'HIRE') {
      if (me.id !== connection.studentId) {
        return NextResponse.json({ error: 'Only the student/parent can hire' }, { status: 403 })
      }
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
      const reward = Math.round((connection.coinsSpent || 0) / 2)
      if (reward > 0) {
        await db.coinTransaction.create({
          data: {
            userId: connection.teacherId,
            amount: reward,
            type: 'HIRE_BONUS',
            description: `Monetize reward — hired after ${connection.coinsSpent} coins contact`,
            connectionId: id,
          },
        })
        await db.user.update({ where: { id: connection.teacherId }, data: { coins: { increment: reward } } })
      }
    } else if (action === 'REJECT') {
      if (me.id !== connection.studentId) {
        return NextResponse.json({ error: 'Only the student/parent can reject' }, { status: 403 })
      }
      if (!['PENDING', 'ACTIVE'].includes(connection.status)) {
        return NextResponse.json({ error: 'This request is already decided' }, { status: 409 })
      }

      const teacherPaid = (connection.coinsSpent || 0) > 0 && Boolean(connection.chatStartedAt)

      if (teacherPaid) {
        // Teacher already paid. Refund only if the student never sent a real message.
        const res = await refundPendingConnection(id, 'REJECTED')
        refundedNow = Boolean(res)
        await db.message.create({
          data: {
            connectionId: id,
            senderId: me.id,
            content: refundedNow
              ? `❌ ${me.name} rejected before chatting — ${connection.coinsSpent} coins were refunded to the teacher.`
              : `❌ ${me.name} rejected this request after chatting — coins are not refunded.`,
            system: true,
          },
        })
        await notify(
          otherId,
          'REJECTED',
          refundedNow ? 'Request rejected — coins refunded' : 'Request rejected',
          refundedNow
            ? `${me.name} rejected before chat started. Your ${connection.coinsSpent} coins were returned.`
            : `${me.name} rejected after chat — no coin refund per policy.`,
          'chats'
        )
      } else {
        // Free pending request — nothing to refund
        await db.$transaction([
          db.connection.update({ where: { id }, data: { status: 'REJECTED', decidedAt: new Date() } }),
          db.message.create({
            data: {
              connectionId: id,
              senderId: me.id,
              content: `❌ ${me.name} declined this request.`,
              system: true,
            },
          }),
        ])
        await notify(otherId, 'REJECTED', 'Request declined', `${me.name} declined the request.`, 'chats')
      }
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
      // Feed the moderation queue so admins can actually review this chat
      await db.report.create({
        data: {
          reporterId: me.id,
          targetType: 'CHAT',
          targetId: id,
          connectionId: id,
          targetUserId: otherId,
          reason: reason || 'Inappropriate Content',
          details: reason ? `Reported in chat: ${reason}` : 'Reported from the chat action row.',
        },
      })
      await notify(otherId, 'SYSTEM', 'Conversation reported', 'A report was submitted on this conversation.')
      // Let admins refresh their queue live
      const admins = await db.user.findMany({ where: { isAdmin: true, status: 'ACTIVE' }, select: { id: true } })
      rtEmit(RT_EVENTS.chatUpdated, { connectionId: id, action, adminRefresh: true }, { userIds: admins.map((a) => a.id) })
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
    // Realtime: wallet badges after hire bonus (refund wallet emit already happens in the REJECT early-return)
    if (action === 'HIRE') rtWalletChanged([connection.teacherId, connection.studentId])

    return NextResponse.json({ connection: toConnectionDTO(updated as never, me.id), refunded: refundedNow })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
