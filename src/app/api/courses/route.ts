import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { toCourseDTO } from '@/lib/dto'
import { scanContent, blockReason, excerpt, MODERATION_REASONS, MODERATION_STATUS } from '@/lib/moderation'
import { parseYouTubeUrl } from '@/lib/youtube'

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

    // YouTube video attachment (optional).
    //   videoKind: INTRO (paid teaser — students watch then Join Request)
    //             | FULL  (complete free course — anyone can watch, course is free)
    // When the teacher pastes a YouTube URL we validate it and auto-extract the
    // thumbnail (unless they uploaded a custom cover).
    let videoUrl: string | null = null
    let videoKind: string | null = null
    let autoThumb: string | null = null
    const rawVideo = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : ''
    if (rawVideo) {
      const yt = parseYouTubeUrl(rawVideo)
      if (!yt) {
        return NextResponse.json(
          { error: 'Please paste a valid YouTube link (youtube.com/watch?v=… or youtu.be/…)' },
          { status: 400 }
        )
      }
      videoUrl = yt.watchUrl
      autoThumb = yt.thumbnailHq // hqDefault always exists; maxres can 404 on some videos
      // Determine the kind: FULL forces the course to be free (everyone can watch).
      const kind = body.videoKind === 'FULL' || body.videoKind === 'INTRO' ? body.videoKind : fee > 0 ? 'INTRO' : 'FULL'
      if (kind === 'FULL' && fee > 0) {
        // A "full free course" can't be paid — override to free.
        return NextResponse.json(
          { error: 'A full free-course video must be free. Set the fee to 0 or choose "Intro video".' },
          { status: 400 }
        )
      }
      videoKind = kind
    }

    // Content moderation: block direct contact info; send description links to review.
    // (videoUrl is a YouTube link — whitelisted, never scanned.)
    const moderationText = [body.title, body.description, body.subject, body.timing, body.format, body.duration].join(' ')
    const scan = scanContent(moderationText)
    const blocked = blockReason(scan)
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 })
    const moderationStatus = scan.hasUnapprovedLink ? MODERATION_STATUS.PENDING : MODERATION_STATUS.APPROVED

    // Use the teacher's uploaded cover if provided, else the YouTube thumbnail.
    const cover = body.cover ? String(body.cover) : autoThumb

    const course = await db.course.create({
      data: {
        teacherId: me.id,
        title: String(body.title).slice(0, 200),
        description: String(body.description).slice(0, 2000),
        cover,
        language: body.language ? String(body.language).slice(0, 100) : null,
        subject: body.subject ? String(body.subject).slice(0, 100) : null,
        duration: body.duration ? String(body.duration).slice(0, 100) : null,
        timing: body.timing ? String(body.timing).slice(0, 100) : null,
        classDuration: body.classDuration ? String(body.classDuration).slice(0, 50) : null,
        classesPerWeek: body.classesPerWeek ? String(body.classesPerWeek).slice(0, 50) : null,
        format: body.format ? String(body.format).slice(0, 200) : null,
        fee: videoKind === 'FULL' ? 0 : fee,
        videoUrl,
        videoKind,
        moderationStatus,
      },
      include: { teacher: true },
    })

    if (moderationStatus === MODERATION_STATUS.PENDING) {
      await db.moderationItem.create({
        data: {
          targetType: 'COURSE',
          targetId: course.id,
          authorId: me.id,
          reason: MODERATION_REASONS.UNAPPROVED_LINK,
          snippet: excerpt(moderationText, scan.linkMatches),
        },
      })
      return NextResponse.json({ course: await toCourseDTO(course, me.id), moderation: 'PENDING' }, { status: 201 })
    }

    return NextResponse.json({ course: await toCourseDTO(course, me.id) }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
