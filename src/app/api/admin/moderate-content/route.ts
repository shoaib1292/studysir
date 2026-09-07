import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'

/**
 * POST /api/admin/moderate-content { type: 'GOOD'|'COURSE'|'TUITION', id, hidden }
 * Soft-hide / restore a reported listing. Hidden listings disappear from feeds,
 * stores and profiles. The owner is notified.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    if (!me.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const type = body?.type as string
    const id = body?.id as string
    const hidden = Boolean(body?.hidden)
    if (!['GOOD', 'COURSE', 'TUITION'].includes(type) || typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    if (type === 'GOOD') {
      const good = await db.digitalGood.findUnique({ where: { id } })
      if (!good) return NextResponse.json({ error: 'Good not found' }, { status: 404 })
      await db.digitalGood.update({ where: { id }, data: { hidden } })
      if (hidden && !good.hidden) {
        await notify(good.sellerId, 'SYSTEM', 'Your listing was removed from the store', `“${good.title}” was hidden by moderators after a review. Contact support if you think this is a mistake.`)
      }
    } else if (type === 'COURSE') {
      const course = await db.course.findUnique({ where: { id } })
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      await db.course.update({ where: { id }, data: { hidden } })
      if (hidden && !course.hidden) {
        await notify(course.teacherId, 'SYSTEM', 'Your course was removed from listings', `“${course.title}” was hidden by moderators after a review. Contact support if you think this is a mistake.`)
      }
    } else {
      const tuition = await db.tuitionPost.findUnique({ where: { id } })
      if (!tuition) return NextResponse.json({ error: 'Tuition post not found' }, { status: 404 })
      await db.tuitionPost.update({ where: { id }, data: { hidden } })
      if (hidden && !tuition.hidden) {
        await notify(tuition.authorId, 'SYSTEM', 'Your tuition post was removed from the feed', `“${tuition.title}” was hidden by moderators after a review. Contact support if you think this is a mistake.`)
      }
    }

    return NextResponse.json({ ok: true, hidden })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
