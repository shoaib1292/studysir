import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toAdminUserDTO } from '@/lib/dto'

/** All users with moderation-relevant counters (admin only). */
export async function GET() {
  try {
    const me = await requireSessionUser()
    if (!me.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })
    const [hires, posts, reports] = await Promise.all([
      db.connection.groupBy({ by: ['teacherId'], _count: { id: true }, where: { status: 'HIRED' } }),
      db.tuitionPost.groupBy({ by: ['authorId'], _count: { id: true } }),
      db.report.groupBy({ by: ['targetUserId'], _count: { id: true }, where: { status: 'OPEN' } }),
    ])

    const hireMap = new Map(hires.map((h) => [h.teacherId, h._count.id]))
    const postMap = new Map(posts.map((p) => [p.authorId, p._count.id]))
    const reportMap = new Map(reports.map((r) => [r.targetUserId, r._count.id]).filter((r): r is [string, number] => Boolean(r[0])))

    return NextResponse.json({
      users: users.map((u) =>
        toAdminUserDTO(u as never, {
          hireCount: hireMap.get(u.id) ?? 0,
          postCount: postMap.get(u.id) ?? 0,
          openReports: reportMap.get(u.id) ?? 0,
        })
      ),
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
