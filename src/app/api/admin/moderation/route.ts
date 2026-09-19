import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser } from '@/lib/session'
import { hasModuleAccess } from '@/lib/permissions'

/**
 * GET /api/admin/moderation?status=PENDING|APPROVED|REJECTED
 * Returns the content-moderation queue (auto-flagged links & contact-info attempts).
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminUser()
    if (!hasModuleAccess(admin, 'moderation')) {
      return NextResponse.json({ error: 'No access to moderation queue' }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'PENDING'

    const items = await db.moderationItem.findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: { id: true, name: true, avatar: true, email: true } } },
    })

    const counts = await db.moderationItem.groupBy({
      by: ['status'],
      _count: { _all: true },
    })
    const byReason = await db.moderationItem.groupBy({
      by: ['reason'],
      _count: { _all: true },
    })

    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        targetType: i.targetType,
        targetId: i.targetId,
        authorId: i.authorId,
        author: i.author,
        reason: i.reason,
        snippet: i.snippet,
        status: i.status,
        adminNote: i.adminNote,
        decidedAt: i.decidedAt ? i.decidedAt.toISOString() : null,
        createdAt: i.createdAt.toISOString(),
      })),
      counts: counts.reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = c._count._all
        return acc
      }, {}),
      byReason: byReason.reduce<Record<string, number>>((acc, c) => {
        acc[c.reason] = c._count._all
        return acc
      }, {}),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
