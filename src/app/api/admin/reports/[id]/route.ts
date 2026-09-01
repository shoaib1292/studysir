import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toReportDTO } from '@/lib/dto'
import { notify } from '@/lib/coins'

/** Resolve or dismiss a report (admin only). Notifies the reporter that action was taken. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    if (!me.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { id } = await ctx.params
    const report = await db.report.findUnique({ where: { id } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const body = await req.json().catch(() => null)
    const action = body?.action as string
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : undefined
    if (!['RESOLVE', 'DISMISS'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updated = await db.report.update({
      where: { id },
      data: {
        status: action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED',
        note: note || null,
        resolvedAt: new Date(),
      },
      include: { reporter: true, targetUser: true },
    })

    await notify(
      report.reporterId,
      'SYSTEM',
      action === 'RESOLVE' ? 'Your report was reviewed — action taken' : 'Your report was reviewed',
      action === 'RESOLVE'
        ? `Thanks for reporting. Our team reviewed the ${report.targetType.toLowerCase()} report and took action.`
        : `Thanks for reporting. Our team reviewed the ${report.targetType.toLowerCase()} report and found no violation.`
    )

    return NextResponse.json({ report: toReportDTO(updated as never) })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
