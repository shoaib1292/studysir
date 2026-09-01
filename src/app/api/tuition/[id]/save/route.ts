import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

/** POST /api/tuition/:id/save — toggle the bookmark on a tuition post. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params

    const post = await db.tuitionPost.findUnique({ where: { id }, select: { id: true } })
    if (!post) return NextResponse.json({ error: 'Tuition post not found' }, { status: 404 })

    const existing = await db.save.findUnique({
      where: { userId_tuitionPostId: { userId: me.id, tuitionPostId: id } },
      select: { id: true },
    })

    if (existing) {
      await db.save.delete({ where: { id: existing.id } })
      return NextResponse.json({ saved: false })
    }
    await db.save.create({ data: { userId: me.id, tuitionPostId: id } })
    return NextResponse.json({ saved: true })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
