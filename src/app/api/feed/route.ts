import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { toTuitionDTO, toCourseDTO, toGoodDTO, toTeacherCardDTO } from '@/lib/dto'
import { processExpiredConnections } from '@/lib/coins'
import type { FeedItem } from '@/lib/types'

export async function GET(req: NextRequest) {
  const viewerId = await getSessionUserId()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'all'
  const q = (searchParams.get('q') ?? '').trim().toLowerCase()

  // Opportunistic auto-refund sweep (cheap; stale rows only)
  processExpiredConnections().catch(() => null)

  const matchQ = (...fields: (string | null | undefined)[]) =>
    q ? fields.some((f) => (f ?? '').toLowerCase().includes(q)) : true

  const items: FeedItem[] = []

  if (type === 'all' || type === 'tuition') {
    const tuitions = await db.tuitionPost.findMany({
      where: { status: { not: 'CLOSED' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: true },
    })
    for (const t of tuitions) {
      if (!matchQ(t.title, t.description, t.subjects, t.city, t.author.name)) continue
      items.push({ kind: 'tuition', createdAt: t.createdAt.toISOString(), tuition: await toTuitionDTO(t, viewerId) })
    }
  }

  if (type === 'all' || type === 'course') {
    const courses = await db.course.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { teacher: true } })
    for (const c of courses) {
      if (!matchQ(c.title, c.description, c.subject, c.teacher.name)) continue
      items.push({ kind: 'course', createdAt: c.createdAt.toISOString(), course: await toCourseDTO(c, viewerId) })
    }
  }

  if (type === 'all' || type === 'good') {
    const goods = await db.digitalGood.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { seller: true } })
    for (const g of goods) {
      if (!matchQ(g.title, g.description, g.seller.name)) continue
      items.push({ kind: 'good', createdAt: g.createdAt.toISOString(), good: await toGoodDTO(g, viewerId) })
    }
  }

  if (type === 'all' || type === 'teacher') {
    const teachers = await db.user.findMany({ where: { role: 'TEACHER' }, take: 50 })
    for (const u of teachers) {
      if (!matchQ(u.name, u.bio, u.headline, u.city)) continue
      items.push({
        kind: 'teacher',
        createdAt: u.createdAt.toISOString(),
        teacher: await toTeacherCardDTO(u, viewerId),
      })
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({ items })
}
