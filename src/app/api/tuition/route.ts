import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { computeCoinCost } from '@/lib/coins'
import { toTuitionDTO } from '@/lib/dto'

function handle(e: unknown) {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status })
  }
  console.error(e)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    if (me.role === 'TEACHER') {
      return NextResponse.json({ error: 'Only students/parents can post tuition requests' }, { status: 403 })
    }
    const body = await req.json().catch(() => null)
    if (!body?.title || !body?.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }
    const feeMin = Number(body.feeMin) || 0
    const feeMax = Number(body.feeMax) || 0
    const mode = ['ONLINE', 'HOME', 'CENTER'].includes(body.mode) ? body.mode : 'ONLINE'
    const coinCost = computeCoinCost(feeMin, feeMax, mode)

    const tuition = await db.tuitionPost.create({
      data: {
        authorId: me.id,
        title: String(body.title).slice(0, 200),
        description: String(body.description).slice(0, 2000),
        image: body.image ? String(body.image) : null,
        mode,
        city: body.city ? String(body.city).slice(0, 100) : null,
        subjects: body.subjects ? String(body.subjects).slice(0, 200) : null,
        languages: body.languages ? String(body.languages).slice(0, 200) : null,
        qualification: body.qualification ? String(body.qualification).slice(0, 200) : null,
        feeMin,
        feeMax,
        timing: body.timing ? String(body.timing).slice(0, 100) : null,
        coinCost,
      },
      include: { author: true },
    })

    return NextResponse.json({ tuition: await toTuitionDTO(tuition, me.id) }, { status: 201 })
  } catch (e) {
    return handle(e)
  }
}
