import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'
import { toTuitionDTO } from '@/lib/dto'
import { computeCoinCost } from '@/lib/coins'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewerId = await getSessionUserId()
  if (!viewerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const tuition = await db.tuitionPost.findUnique({ where: { id } })
  if (!tuition) return NextResponse.json({ error: 'Tuition post not found' }, { status: 404 })
  if (tuition.authorId !== viewerId) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const data: Record<string, unknown> = {}

  // --- Status-only update (close / reopen) ---
  const status = body?.status as string | undefined
  if (status) {
    if (!['OPEN', 'HIRED', 'CLOSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    data.status = status
  }

  // --- Content edit (author only; recomputes the coin cost from new fee/mode) ---
  const isEdit = Boolean(body?.edit)
  if (isEdit) {
    const title = typeof body?.title === 'string' ? body.title.trim() : tuition.title
    const description = typeof body?.description === 'string' ? body.description.trim() : tuition.description
    const mode = typeof body?.mode === 'string' ? body.mode : tuition.mode
    const feeMin = body?.feeMin !== undefined ? Number(body.feeMin) : tuition.feeMin
    const feeMax = body?.feeMax !== undefined ? Number(body.feeMax) : tuition.feeMax

    if (title.length < 3) return NextResponse.json({ error: 'Title is too short' }, { status: 400 })
    if (description.length < 3) return NextResponse.json({ error: 'Description is too short' }, { status: 400 })
    if (!['ONLINE', 'HOME', 'CENTER'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }
    if (!Number.isFinite(feeMin) || !Number.isFinite(feeMax) || feeMin <= 0 || feeMax < feeMin) {
      return NextResponse.json({ error: 'Invalid fee range' }, { status: 400 })
    }

    const str = (v: unknown, fallback: string | null) =>
      typeof v === 'string' ? v.trim().slice(0, 200) || null : fallback

    data.title = title.slice(0, 120)
    data.description = description.slice(0, 2000)
    data.mode = mode
    data.city = str(body?.city, tuition.city)
    data.subjects = str(body?.subjects, tuition.subjects)
    data.languages = str(body?.languages, tuition.languages)
    data.qualification = str(body?.qualification, tuition.qualification)
    data.timing = str(body?.timing, tuition.timing)
    data.feeMin = feeMin
    data.feeMax = feeMax
    // Contact price follows the updated fee weight + mode
    data.coinCost = computeCoinCost(feeMin, feeMax, mode)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await db.tuitionPost.update({
    where: { id },
    data,
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
