import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

export async function POST() {
  try {
    const me = await requireSessionUser()
    await db.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
