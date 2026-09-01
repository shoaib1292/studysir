import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

const VALID = ['TEACHER', 'COURSE', 'GOOD', 'TUITION']

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const { targetType, targetId } = body ?? {}
    if (!VALID.includes(targetType) || !targetId) {
      return NextResponse.json({ error: 'Invalid targetType or targetId' }, { status: 400 })
    }

    const existing = await db.like.findUnique({
      where: { userId_targetType_targetId: { userId: me.id, targetType, targetId } },
    })

    if (existing) {
      await db.like.delete({ where: { id: existing.id } })
    } else {
      await db.like.create({ data: { userId: me.id, targetType, targetId } })
    }

    const likeCount = await db.like.count({ where: { targetType, targetId } })
    return NextResponse.json({ liked: !existing, likeCount })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
