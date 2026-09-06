import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

/** DELETE /api/shares/:id — sharer removes their own share (admins can remove any). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    const { id } = await ctx.params
    const share = await db.sharedPost.findUnique({ where: { id } })
    if (!share) throw new HttpError(404, 'Share not found')
    if (share.authorId !== me.id && !me.isAdmin) throw new HttpError(403, 'You can only delete your own shares')
    await db.sharedPost.delete({ where: { id } })
    await db.like.deleteMany({ where: { targetType: 'SHARED', targetId: id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
