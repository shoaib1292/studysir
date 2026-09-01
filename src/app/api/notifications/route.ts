import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

export async function GET() {
  try {
    const me = await requireSessionUser()
    const [notifications, unread] = await Promise.all([
      db.notification.findMany({ where: { userId: me.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      db.notification.count({ where: { userId: me.id, read: false } }),
    ])
    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unread,
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
