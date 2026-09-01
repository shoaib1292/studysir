import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { toUserDTO, toTeacherCardDTO, likeInfo, toTuitionDTO, toCourseDTO, toGoodDTO } from '@/lib/dto'
import type { ReviewDTO, FeedItem, StudentDTO } from '@/lib/types'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewerId = await getSessionUserId()

  const user = await db.user.findUnique({
    where: { id },
    include: { availabilities: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Stats
  const [likeInfoT, reviews, hireCount, connectionCount] = await Promise.all([
    likeInfo('TEACHER', id, viewerId),
    db.review.findMany({
      where: { targetId: id },
      orderBy: { createdAt: 'desc' },
      include: { author: true, target: true },
    }),
    db.connection.count({ where: { teacherId: id, status: 'HIRED' } }),
    db.connection.count({ where: { teacherId: id, status: { in: ['HIRED', 'ACTIVE'] } } }),
  ])

  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0

  const reviewDTOs: ReviewDTO[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    author: {
      id: r.author.id,
      name: r.author.name,
      avatar: r.author.avatar,
      headline: r.author.headline,
    },
    target: {
      id: r.target.id,
      name: r.target.name,
      avatar: r.target.avatar,
    },
  }))

  // Posts by this user (tuitions, courses, goods) — moderation-hidden listings stay hidden on profiles too
  const [tuitions, courses, goods] = await Promise.all([
    db.tuitionPost.findMany({ where: { authorId: id, hidden: false }, orderBy: { createdAt: 'desc' }, include: { author: true } }),
    db.course.findMany({ where: { teacherId: id, hidden: false }, orderBy: { createdAt: 'desc' }, include: { teacher: true } }),
    db.digitalGood.findMany({ where: { sellerId: id, hidden: false }, orderBy: { createdAt: 'desc' }, include: { seller: true } }),
  ])

  const items: FeedItem[] = []
  for (const t of tuitions) {
    items.push({ kind: 'tuition', createdAt: t.createdAt.toISOString(), tuition: await toTuitionDTO(t, viewerId) })
  }
  for (const c of courses) {
    items.push({ kind: 'course', createdAt: c.createdAt.toISOString(), course: await toCourseDTO(c, viewerId) })
  }
  for (const g of goods) {
    items.push({ kind: 'good', createdAt: g.createdAt.toISOString(), good: await toGoodDTO(g, viewerId) })
  }
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayIdx = (d: string) => {
    const i = DAY_ORDER.indexOf(d)
    return i === -1 ? 99 : i
  }
  const sortedAvailabilities = [...user.availabilities].sort((a, b) => dayIdx(a.day) - dayIdx(b.day))

  // Students taught by this teacher (from hired connections), newest hire first
  const students: StudentDTO[] = []
  if (user.role === 'TEACHER') {
    const hired = await db.connection.findMany({
      where: { teacherId: id, status: 'HIRED' },
      orderBy: { decidedAt: 'desc' },
      include: { student: true },
    })
    const seen = new Set<string>()
    for (const c of hired) {
      if (seen.has(c.studentId)) continue
      seen.add(c.studentId)
      students.push({
        id: c.student.id,
        name: c.student.name,
        avatar: c.student.avatar,
        headline: c.student.headline,
        city: c.student.city,
        role: c.student.role as import('@/lib/types').Role,
        hiredAt: (c.decidedAt ?? c.updatedAt).toISOString(),
      })
    }
  }

  return NextResponse.json({
    user: toUserDTO(user),
    stats: {
      likeCount: likeInfoT.likeCount,
      reviewCount: reviews.length,
      avgRating: Math.round(avg * 10) / 10,
      hireCount,
      connectionCount,
    },
    reviews: reviewDTOs,
    availabilities: sortedAvailabilities.map((a) => ({ id: a.id, day: a.day, slots: a.slots })),
    posts: items,
    students,
    teacherCard: user.role === 'TEACHER' ? await toTeacherCardDTO(user, viewerId) : null,
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewerId = await getSessionUserId()
  if (!viewerId || viewerId !== id) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const data: Record<string, unknown> = {}
  const strFields = ['name', 'headline', 'bio', 'city', 'subjects', 'languages', 'qualification', 'gender']
  for (const f of strFields) {
    if (typeof body[f] === 'string') data[f] = body[f]
  }
  if (typeof body.avatar === 'string' || body.avatar === null) data.avatar = body.avatar
  if (typeof body.coverImage === 'string' || body.coverImage === null) data.coverImage = body.coverImage
  if (body.feeMin !== undefined) data.feeMin = body.feeMin === null ? null : Number(body.feeMin)
  if (body.feeMax !== undefined) data.feeMax = body.feeMax === null ? null : Number(body.feeMax)

  // Availability: replace-all strategy. Accepts [{ day, slots }]
  let availabilityRows: { day: string; slots: string }[] | null = null
  if (Array.isArray(body.availabilities)) {
    availabilityRows = (body.availabilities as { day?: unknown; slots?: unknown }[])
      .map((a) => ({ day: String(a?.day ?? '').trim(), slots: String(a?.slots ?? '').trim() }))
      .filter((a) => a.day.length > 0 && a.slots.length > 0)
      .slice(0, 7)
  }

  const [, user] = await db.$transaction(async (tx) => {
    if (availabilityRows) {
      await tx.availability.deleteMany({ where: { userId: id } })
      if (availabilityRows.length) {
        await tx.availability.createMany({
          data: availabilityRows.map((r) => ({ userId: id, day: r.day, slots: r.slots })),
        })
      }
    }
    return [null, await tx.user.update({ where: { id }, data })]
  })

  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayIdx = (d: string) => {
    const i = DAY_ORDER.indexOf(d)
    return i === -1 ? 99 : i
  }
  const availabilities = await db.availability.findMany({ where: { userId: id } })
  availabilities.sort((a, b) => dayIdx(a.day) - dayIdx(b.day))

  return NextResponse.json({
    user: toUserDTO(user),
    availabilities: availabilities.map((a) => ({ id: a.id, day: a.day, slots: a.slots })),
  })
}
