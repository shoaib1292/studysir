import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

/** RFC 4180 CSV field escaping (quotes, commas, newlines). */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * GET /api/admin/reports/export
 * Admin-only CSV export of every report (moderation audit trail).
 * Opens as a download: reports-YYYY-MM-DD.csv
 */
export async function GET() {
  try {
    const me = await requireSessionUser()
    if (!me.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const reports = await db.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: { reporter: true, targetUser: true },
    })

    // Content snapshot labels (GOOD/COURSE/TUITION titles + hidden state)
    const rows: string[] = []
    const header = [
      'id', 'created_at', 'status', 'target_type', 'target_label', 'target_hidden',
      'reporter', 'reporter_email', 'target_user', 'connection_id',
      'reason', 'details', 'moderator_note', 'resolved_at',
    ]
    rows.push(header.map(csvCell).join(','))

    for (const r of reports) {
      let targetLabel = ''
      let targetHidden = false
      if (r.targetType === 'GOOD' && r.targetId) {
        const g = await db.digitalGood.findUnique({ where: { id: r.targetId }, select: { title: true, hidden: true } })
        targetLabel = g?.title ?? ''
        targetHidden = g?.hidden ?? false
      } else if (r.targetType === 'COURSE' && r.targetId) {
        const c = await db.course.findUnique({ where: { id: r.targetId }, select: { title: true, hidden: true } })
        targetLabel = c?.title ?? ''
        targetHidden = c?.hidden ?? false
      } else if (r.targetType === 'TUITION' && r.targetId) {
        const t = await db.tuitionPost.findUnique({ where: { id: r.targetId }, select: { title: true, hidden: true } })
        targetLabel = t?.title ?? ''
        targetHidden = t?.hidden ?? false
      } else if (r.targetType === 'CHAT') {
        targetLabel = r.connectionId ? `chat ${r.connectionId}` : 'chat'
      } else if (r.targetType === 'USER') {
        targetLabel = r.targetUser?.name ?? r.targetId ?? 'user'
      }

      rows.push([
        r.id,
        r.createdAt.toISOString(),
        r.status,
        r.targetType,
        targetLabel,
        targetHidden ? 'yes' : 'no',
        r.reporter?.name ?? '',
        r.reporter?.email ?? '',
        r.targetUser?.name ?? '',
        r.connectionId ?? '',
        r.reason,
        r.details ?? '',
        r.note ?? '',
        r.resolvedAt ? r.resolvedAt.toISOString() : '',
      ].map(csvCell).join(','))
    }

    const csv = '\ufeff' + rows.join('\r\n') // BOM so Excel opens UTF-8 correctly
    const date = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="studysir-reports-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
