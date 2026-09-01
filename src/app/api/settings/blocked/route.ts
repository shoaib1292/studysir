import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toUserDTO } from '@/lib/dto'

export async function GET() {
  try {
    const me = await requireSessionUser()
    const blocks = await db.block.findMany({
      where: { blockerId: me.id },
      include: { blocked: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ users: blocks.map((b) => toUserDTO(b.blocked)) })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
