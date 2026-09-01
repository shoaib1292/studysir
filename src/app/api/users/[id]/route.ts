import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { toUserDTO, toTeacherCardDTO, likeInfo, toTuitionDTO, toCourseDTO, toGoodDTO } from '@/lib/dto'
import type { ReviewDTO, FeedItem } from '@/lib/types'

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

  // Posts by this user (tuitions, courses, goods)
  const [tuitions, courses, goods] = await Promise.all([
    db.tuitionPost.findMany({ where: { authorId: id }, orderBy: { createdAt: 'desc' }, include: { author: true } }),
    db.course.findMany({ where: { teacherId: id }, orderBy: { createdAt: 'desc' }, include: { teacher: true } }),
    db.digitalGood.findMany({ where: { sellerId: id }, orderBy: { createdAt: 'desc' }, include: { seller: true } }),
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
    availabilities: user.availabilities.map((a) => ({ id: a.id, day: a.day, slots: a.slots })),
    posts: items,
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

  const user = await db.user.update({ where: { id }, data })
  return NextResponse.json({ user: toUserDTO(user) })
}
