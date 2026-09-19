import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'

/**
 * POST /api/shares — Facebook-style share-to-feed (requirement M).
 * Body: { targetType: 'TUITION'|'COURSE'|'GOOD'|'TEACHER', targetId, text? }
 * Creates a SharedPost that appears in the feed as "<user> shared a post"
 * with the original content embedded — the post content itself travels, not a link.
 */
export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json()
    const targetType = String(body.targetType ?? '')
    const targetId = String(body.targetId ?? '')
    const text = String(body.text ?? '').slice(0, 2000)

    if (!['TUITION', 'COURSE', 'GOOD', 'TEACHER'].includes(targetType)) {
      throw new HttpError(400, 'Invalid share target')
    }
    if (!targetId) throw new HttpError(400, 'Missing targetId')

    // Verify the original exists and is not hidden
    let ok = false
    if (targetType === 'TUITION') {
      ok = !!(await db.tuitionPost.findFirst({ where: { id: targetId, hidden: false, status: { not: 'CLOSED' } } }))
    } else if (targetType === 'COURSE') {
      ok = !!(await db.course.findFirst({ where: { id: targetId, hidden: false } }))
    } else if (targetType === 'GOOD') {
      ok = !!(await db.digitalGood.findFirst({ where: { id: targetId, hidden: false } }))
    } else if (targetType === 'TEACHER') {
      ok = !!(await db.user.findFirst({ where: { id: targetId, role: 'TEACHER', status: 'ACTIVE' } }))
    }
    if (!ok) throw new HttpError(404, 'The original post is no longer available')

    const shared = await db.sharedPost.create({
      data: {
        authorId: me.id,
        text,
        targetType,
        tuitionId: targetType === 'TUITION' ? targetId : null,
        courseId: targetType === 'COURSE' ? targetId : null,
        goodId: targetType === 'GOOD' ? targetId : null,
        teacherId: targetType === 'TEACHER' ? targetId : null,
      },
    })

    // Notify the original author that their post was shared
    let notified = false
    if (targetType === 'TUITION') {
      const t = await db.tuitionPost.findUnique({ where: { id: targetId }, select: { authorId: true, title: true } })
      if (t && t.authorId !== me.id) {
        notified = true
        await notify(t.authorId, 'SYSTEM', 'Your post was shared', `${me.name} shared your tuition post "${t.title}"`, 'feed')
      }
    } else if (targetType === 'COURSE' || targetType === 'GOOD') {
      const row =
        targetType === 'COURSE'
          ? await db.course.findUnique({ where: { id: targetId }, select: { teacherId: true, title: true } })
          : await db.digitalGood.findUnique({ where: { id: targetId }, select: { sellerId: true, title: true } })
      const ownerId = row ? ('teacherId' in row ? row.teacherId : row.sellerId) : null
      if (ownerId && ownerId !== me.id) {
        notified = true
        await notify(
          ownerId,
          'SYSTEM',
          'Your post was shared',
          `${me.name} shared your ${targetType === 'COURSE' ? 'course' : 'item'} "${row!.title}"`,
          'feed'
        )
      }
    }

    return NextResponse.json({ shared: { id: shared.id }, notified })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
