import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { computeCoinCost, DIRECT_ACCEPT_COST, notify, processExpiredConnections } from '@/lib/coins'
import { toConnectionDTO } from '@/lib/dto'
import { rtEmit, RT_EVENTS, rtWalletChanged } from '@/lib/realtime'
import { scheduleAIOnNewRequest } from '@/lib/ai'
import type { ConnectionDTO } from '@/lib/types'

export async function GET() {
  try {
    const me = await requireSessionUser()

    // auto-expire / auto-refund stale connections first (10-day rule)
    processExpiredConnections().catch(() => null)

    const connections = await db.connection.findMany({
      where: { OR: [{ teacherId: me.id }, { studentId: me.id }, { payerId: me.id }] },
      orderBy: { updatedAt: 'desc' },
      include: { teacher: true, student: true, tuitionPost: { select: { id: true, title: true, coinCost: true } } },
    })

    const dtos: ConnectionDTO[] = []
    for (const c of connections) {
      const [lastMessage, unreadCount] = await Promise.all([
        db.message.findFirst({ where: { connectionId: c.id }, orderBy: { createdAt: 'desc' } }),
        db.message.count({
          where: { connectionId: c.id, senderId: { not: me.id }, readAt: null, system: false, deletedAt: null },
        }),
      ])
      dtos.push(toConnectionDTO(c as never, me.id, lastMessage, unreadCount))
    }

    return NextResponse.json({ connections: dtos })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Create a connection request — THE REQUEST IS ALWAYS FREE.
 *
 *  - tuitionPostId → a TEACHER accepts the student's tuition post. Accepting is
 *    a paid action: the teacher's coins are charged HERE (the UI shows the cost
 *    before confirming). Chat unlocks immediately (status ACTIVE).
 *  - courseId      → a STUDENT sends a join request (free, PENDING). The teacher
 *    accepts later (pays coins then).
 *  - teacherId     → a STUDENT sends a direct request to a teacher (free,
 *    PENDING). The teacher accepts later (pays coins then).
 *
 * Students NEVER pay coins — they have no coins (money wallet only).
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    let teacherId: string
    let studentId: string
    let coins: number
    let tuitionPostId: string | null = null
    let contextLabel = ''
    let acceptNow = false // teacher accepting a tuition post → pay + unlock chat now

    if (body.tuitionPostId) {
      // Teacher ACCEPTS a tuition post (paid — cost shown in the confirm dialog)
      const post = await db.tuitionPost.findUnique({ where: { id: body.tuitionPostId }, include: { author: true } })
      if (!post) return NextResponse.json({ error: 'Tuition post not found' }, { status: 404 })
      if (post.status !== 'OPEN') return NextResponse.json({ error: 'This tuition post is no longer open' }, { status: 409 })
      if (me.role !== 'TEACHER') return NextResponse.json({ error: 'Only teachers can accept tuition posts' }, { status: 403 })
      if (post.authorId === me.id) return NextResponse.json({ error: 'This is your own post' }, { status: 400 })

      tuitionPostId = post.id
      teacherId = me.id
      studentId = post.authorId
      coins = post.coinCost || computeCoinCost(post.feeMin, post.feeMax, post.mode)
      contextLabel = post.title
      acceptNow = true
    } else if (body.courseId) {
      // Student sends a FREE join request to a course teacher
      const course = await db.course.findUnique({ where: { id: body.courseId }, include: { teacher: true } })
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      if (me.role === 'TEACHER') return NextResponse.json({ error: 'Teachers cannot join courses' }, { status: 403 })
      if (course.teacherId === me.id) return NextResponse.json({ error: 'This is your own course' }, { status: 400 })

      teacherId = course.teacherId
      studentId = me.id
      coins = 0 // teacher pays when they accept
      contextLabel = course.title
    } else if (body.teacherId) {
      // Student sends a FREE direct request to a teacher
      const teacher = await db.user.findUnique({ where: { id: body.teacherId } })
      if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
      if (teacher.id === me.id) return NextResponse.json({ error: 'You cannot contact yourself' }, { status: 400 })
      if (teacher.role !== 'TEACHER') return NextResponse.json({ error: 'Can only connect to teachers' }, { status: 400 })
      if (me.role === 'TEACHER') return NextResponse.json({ error: 'Teachers can only accept tuition posts' }, { status: 403 })

      teacherId = teacher.id
      studentId = me.id
      coins = 0
      contextLabel = teacher.name
    } else {
      return NextResponse.json({ error: 'Provide tuitionPostId, courseId or teacherId' }, { status: 400 })
    }

    // Existing connection check — reuse instead of duplicating
    const existing = await db.connection.findFirst({
      where: {
        teacherId,
        studentId,
        ...(tuitionPostId ? { tuitionPostId } : {}),
        status: { in: ['PENDING', 'ACTIVE'] },
      },
    })
    if (existing) {
      return NextResponse.json({ connection: await connectionDTOById(existing.id, me.id), reused: true })
    }

    // Paid accept (teacher + tuition post): check & charge teacher coins
    if (acceptNow) {
      if (me.coins < coins) {
        return NextResponse.json(
          { error: `Not enough coins — accepting costs ${coins} coins, you have ${me.coins}` },
          { status: 402 }
        )
      }
    }

    const connection = await db.$transaction(async (tx) => {
      if (acceptNow) {
        await tx.user.update({ where: { id: teacherId }, data: { coins: { decrement: coins } } })
      }
      const conn = await tx.connection.create({
        data: {
          teacherId,
          studentId,
          payerId: teacherId, // the teacher is ALWAYS the coin payer
          tuitionPostId,
          coinsSpent: coins,
          status: acceptNow ? 'ACTIVE' : 'PENDING',
          chatStartedAt: acceptNow ? new Date() : null,
        },
      })
      if (acceptNow) {
        await tx.coinTransaction.create({
          data: {
            userId: teacherId,
            amount: -coins,
            type: 'SPEND_CONTACT',
            description: `Accepted tuition “${contextLabel}”`,
            connectionId: conn.id,
          },
        })
        if (tuitionPostId) {
          await tx.tuitionPost.update({ where: { id: tuitionPostId }, data: { status: 'ACTIVE' } })
        }
      }
      return conn
    })

    // Notify the other side
    if (acceptNow) {
      await notify(
        studentId,
        'CONNECT_REQUEST',
        `${me.name} accepted your request`,
        `${me.name} is now available in chat for “${contextLabel}”.`,
        'chats'
      )
      // AI hook: if the student is an AI agent, it should start the conversation
      scheduleAIOnNewRequest(connection.id).catch(() => null)
    } else {
      await notify(
        teacherId,
        'CONNECT_REQUEST',
        `New request from ${me.name}`,
        `${me.name} sent you a request${body.courseId ? ` for “${contextLabel}”` : ''}. Accept to unlock chat.`,
        'chats'
      )
      // AI hook: if the teacher is an AI agent, it may accept on its own schedule
      scheduleAIOnNewRequest(connection.id).catch(() => null)
    }

    // Realtime: new chat appears instantly in the recipient's list; wallet badge updates for payer
    rtEmit(RT_EVENTS.chatUpdated, { connectionId: connection.id, action: 'NEW' }, {
      userIds: [studentId === me.id ? teacherId : studentId],
    })
    if (acceptNow) rtWalletChanged([teacherId])

    return NextResponse.json({ connection: await connectionDTOById(connection.id, me.id) }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function connectionDTOById(id: string, viewerId: string) {
  const c = await db.connection.findUnique({
    where: { id },
    include: { teacher: true, student: true, tuitionPost: { select: { id: true, title: true, coinCost: true } } },
  })
  return toConnectionDTO(c as never, viewerId, null, 0)
}
