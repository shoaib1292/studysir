import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toReportDTO } from '@/lib/dto'
import type { AdminStats, ReportDTO } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    if (!me.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const status = req.nextUrl.searchParams.get('status') ?? ''
    const where = ['OPEN', 'RESOLVED', 'DISMISSED'].includes(status) ? { status } : {}

    const [reports, openCount, resolvedCount, dismissedCount, bannedUsers] = await Promise.all([
      db.report.findMany({
        where,
        orderBy: [{ status: 'desc' }, { createdAt: 'desc' }], // OPEN first, newest first
        include: { reporter: true, targetUser: true },
        take: 200,
      }),
      db.report.count({ where: { status: 'OPEN' } }),
      db.report.count({ where: { status: 'RESOLVED' } }),
      db.report.count({ where: { status: 'DISMISSED' } }),
      db.user.count({ where: { status: 'BANNED' } }),
    ])

    // Attach content snapshots for GOOD / COURSE / TUITION targets
    const items: ReportDTO[] = await Promise.all(
      reports.map(async (r) => {
        let targetLabel: string | null = null
        let targetImage: string | null = null
        let targetHidden = false
        if (r.targetType === 'GOOD' && r.targetId) {
          const g = await db.digitalGood.findUnique({ where: { id: r.targetId }, select: { title: true, image: true, hidden: true } })
          targetLabel = g?.title ?? null
          targetImage = g?.image ?? null
          targetHidden = g?.hidden ?? false
        } else if (r.targetType === 'COURSE' && r.targetId) {
          const c = await db.course.findUnique({ where: { id: r.targetId }, select: { title: true, cover: true, hidden: true } })
          targetLabel = c?.title ?? null
          targetImage = c?.cover ?? null
          targetHidden = c?.hidden ?? false
        } else if (r.targetType === 'TUITION' && r.targetId) {
          const t = await db.tuitionPost.findUnique({ where: { id: r.targetId }, select: { title: true, hidden: true } })
          targetLabel = t?.title ?? null
          targetHidden = t?.hidden ?? false
        }
        const dto = toReportDTO(r as never)
        return { ...dto, targetLabel, targetImage, targetHidden }
      })
    )

    const stats: AdminStats = { open: openCount, resolved: resolvedCount, dismissed: dismissedCount, bannedUsers }
    return NextResponse.json({ reports: items, stats })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
