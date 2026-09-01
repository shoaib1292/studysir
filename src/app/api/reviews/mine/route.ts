import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'

export async function GET() {
  try {
    const me = await requireSessionUser()
    const reviews = await db.review.findMany({
      where: { authorId: me.id },
      orderBy: { createdAt: 'desc' },
      include: { author: true, target: true },
    })
    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        author: { id: r.author.id, name: r.author.name, avatar: r.author.avatar, headline: r.author.headline },
        target: { id: r.target.id, name: r.target.name, avatar: r.target.avatar },
      })),
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
