import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toTuitionDTO } from '@/lib/dto'

/** GET /api/saved — tuition posts bookmarked by the current user (newest save first). */
export async function GET() {
  try {
    const me = await requireSessionUser()
    const saves = await db.save.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      include: { tuitionPost: { include: { author: true } } },
    })
    const items = []
    for (const s of saves) {
      items.push(await toTuitionDTO(s.tuitionPost as never, me.id))
    }
    return NextResponse.json({ items })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
