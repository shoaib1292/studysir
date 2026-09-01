import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const userId = body?.userId as string | undefined
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    await db.block.deleteMany({ where: { blockerId: me.id, blockedId: userId } })

    // clear block flag on any connection between the two where I was the blocker
    await db.connection.updateMany({
      where: {
        blockedBy: me.id,
        OR: [
          { teacherId: me.id, studentId: userId },
          { teacherId: userId, studentId: me.id },
        ],
      },
      data: { blockedBy: null },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
