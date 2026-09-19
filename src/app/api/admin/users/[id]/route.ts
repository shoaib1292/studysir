import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toUserDTO } from '@/lib/dto'
import { notify } from '@/lib/coins'

/** Ban or unban a user (admin only). Banned users cannot log in or act. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireSessionUser()
    if (!me.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { id } = await ctx.params
    if (id === me.id) return NextResponse.json({ error: 'You cannot ban yourself' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await req.json().catch(() => null)
    const status = body?.status as string
    if (!['BANNED', 'ACTIVE'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updated = await db.user.update({ where: { id }, data: { status } })

    await notify(
      id,
      'SYSTEM',
      status === 'BANNED' ? 'Account suspended' : 'Account reinstated',
      status === 'BANNED'
        ? 'Your account was suspended by a moderator for violating platform rules.'
        : 'Your account was reinstated. Welcome back to StudySir!'
    )

    return NextResponse.json({ user: toUserDTO(updated) })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
