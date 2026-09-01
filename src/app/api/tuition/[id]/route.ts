import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { toTuitionDTO } from '@/lib/dto'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewerId = await getSessionUserId()
  if (!viewerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const tuition = await db.tuitionPost.findUnique({ where: { id } })
  if (!tuition) return NextResponse.json({ error: 'Tuition post not found' }, { status: 404 })
  if (tuition.authorId !== viewerId) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const status = body?.status as string | undefined
  if (!status || !['OPEN', 'HIRED', 'CLOSED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updated = await db.tuitionPost.update({
    where: { id },
    data: { status },
    include: { author: true },
  })
  return NextResponse.json({ tuition: await toTuitionDTO(updated, viewerId) })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewerId = await getSessionUserId()
  const tuition = await db.tuitionPost.findUnique({ where: { id }, include: { author: true } })
  if (!tuition) return NextResponse.json({ error: 'Tuition post not found' }, { status: 404 })
  return NextResponse.json({ tuition: await toTuitionDTO(tuition, viewerId) })
}
