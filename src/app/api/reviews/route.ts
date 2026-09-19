import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    const body = await req.json().catch(() => null)
    const targetId = body?.targetId as string | undefined
    const rating = Number(body?.rating)
    const comment = typeof body?.comment === 'string' ? body.comment.slice(0, 1000) : undefined

    if (!targetId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'targetId and rating (1-5) are required' }, { status: 400 })
    }
    if (targetId === me.id) return NextResponse.json({ error: 'You cannot review yourself' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id: targetId } })
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

    const review = await db.review.create({
      data: { authorId: me.id, targetId, rating: Math.round(rating), comment },
      include: { author: true, target: true },
    })

    await notify(targetId, 'SYSTEM', 'New review received', `${me.name} rated you ${rating}★.`)

    return NextResponse.json(
      {
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
          author: { id: review.author.id, name: review.author.name, avatar: review.author.avatar, headline: review.author.headline },
          target: { id: review.target.id, name: review.target.name, avatar: review.target.avatar },
        },
      },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
