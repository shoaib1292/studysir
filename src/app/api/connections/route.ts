import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify, processExpiredConnections } from '@/lib/coins'
import { toConnectionDTO } from '@/lib/dto'
import { rtEmit, RT_EVENTS, rtWalletChanged } from '@/lib/realtime'

export async function GET() {
  try {
    const me = await requireSessionUser()

    // auto-refund stale PENDING connections first (10-day rule)
    processExpiredConnections().catch(() => null)

    const connections = await db.connection.findMany({
      where: { OR: [{ teacherId: me.id }, { studentId: me.id }, { payerId: me.id }] },
      orderBy: { updatedAt: 'desc' },
      include: { teacher: true, student: true, tuitionPost: { select: { id: true, title: true, coinCost: true } } },
    })

    const dtos = []
    for (const c of connections) {
      const [lastMessage, unreadCount] = await Promise.all([
        db.message.findFirst({ where: { connectionId: c.id }, orderBy: { createdAt: 'desc' } }),
        db.message.count({
          where: { connectionId: c.id, senderId: { not: me.id }, readAt: null, system: false },
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

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    let teacherId: string
    let studentId: string
    let payerId: string
    let coins: number
    let tuitionPostId: string | null = null
    let contextLabel = ''

    if (body.tuitionPostId) {
      // Teacher approaches a tuition post (classic flow)
      const post = await db.tuitionPost.findUnique({ where: { id: body.tuitionPostId }, include: { author: true } })
      if (!post) return NextResponse.json({ error: 'Tuition post not found' }, { status: 404 })
      if (post.status !== 'OPEN') return NextResponse.json({ error: 'This tuition post is no longer open' }, { status: 409 })
      if (me.role !== 'TEACHER') return NextResponse.json({ error: 'Only teachers can contact tuition posters' }, { status: 403 })
      if (post.authorId === me.id) return NextResponse.json({ error: 'This is your own post' }, { status: 400 })

      tuitionPostId = post.id
      teacherId = me.id
      studentId = post.authorId
      payerId = me.id
      coins = post.coinCost
      contextLabel = post.title
    } else if (body.courseId) {
      // Student joins a course → paid chat with the teacher
      const course = await db.course.findUnique({ where: { id: body.courseId }, include: { teacher: true } })
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      if (course.teacherId === me.id) return NextResponse.json({ error: 'This is your own course' }, { status: 400 })

      teacherId = course.teacherId
      studentId = me.id
      payerId = me.id
      coins = Math.min(50, Math.max(5, 5 + Math.round((course.fee || 0) / 10)))
      contextLabel = course.title
    } else if (body.teacherId) {
      // Direct contact with a teacher (profile Hire/Message button)
      const teacher = await db.user.findUnique({ where: { id: body.teacherId } })
      if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
      if (teacher.id === me.id) return NextResponse.json({ error: 'You cannot contact yourself' }, { status: 400 })
      if (teacher.role !== 'TEACHER') return NextResponse.json({ error: 'Can only connect to teachers' }, { status: 400 })

      teacherId = teacher.id
      studentId = me.id
      payerId = me.id
      coins = 10
      contextLabel = teacher.name
    } else {
      return NextResponse.json({ error: 'Provide tuitionPostId, courseId or teacherId' }, { status: 400 })
    }

    // Existing connection check — reuse instead of double charging
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

    if (me.coins < coins) {
      return NextResponse.json(
        { error: `Not enough coins — this contact costs ${coins} coins, you have ${me.coins}` },
        { status: 402 }
      )
    }

    const connection = await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: payerId }, data: { coins: { decrement: coins } } })
      const conn = await tx.connection.create({
        data: { teacherId, studentId, payerId, tuitionPostId, coinsSpent: coins, status: 'PENDING' },
      })
      await tx.coinTransaction.create({
        data: {
          userId: payerId,
          amount: -coins,
          type: 'SPEND_CONTACT',
          description: `Contacted ${contextLabel}`,
          connectionId: conn.id,
        },
      })
      return conn
    })

    // Notify the student/parent
    const recipient = studentId === me.id ? teacherId : studentId
    await notify(
      recipient,
      'CONNECT_REQUEST',
      `${me.name} wants to connect`,
      `${me.name} spent ${coins} coins to contact you${tuitionPostId ? '' : ' directly'}.`,
      'chats'
    )

    // Realtime: new chat appears instantly in the recipient's list; payer's wallet badge updates
    rtEmit(RT_EVENTS.chatUpdated, { connectionId: connection.id, action: 'NEW' }, {
      userIds: [recipient],
    })
    rtWalletChanged([payerId])

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
