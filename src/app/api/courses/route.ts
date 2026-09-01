import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toCourseDTO } from '@/lib/dto'

export async function POST(req: NextRequest) {
  try {
    const me = await requireSessionUser()
    if (me.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Only teachers can post courses' }, { status: 403 })
    }
    const body = await req.json().catch(() => null)
    if (!body?.title || !body?.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }
    const fee = Number(body.fee) || 0

    const course = await db.course.create({
      data: {
        teacherId: me.id,
        title: String(body.title).slice(0, 200),
        description: String(body.description).slice(0, 2000),
        cover: body.cover ? String(body.cover) : null,
        language: body.language ? String(body.language).slice(0, 100) : null,
        subject: body.subject ? String(body.subject).slice(0, 100) : null,
        duration: body.duration ? String(body.duration).slice(0, 100) : null,
        timing: body.timing ? String(body.timing).slice(0, 100) : null,
        classDuration: body.classDuration ? String(body.classDuration).slice(0, 50) : null,
        classesPerWeek: body.classesPerWeek ? String(body.classesPerWeek).slice(0, 50) : null,
        format: body.format ? String(body.format).slice(0, 200) : null,
        fee,
      },
      include: { teacher: true },
    })

    return NextResponse.json({ course: await toCourseDTO(course, me.id) }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
