import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'
import { notify } from '@/lib/coins'

export interface PersonaInput {
  tagline?: string
  style?: string
  activeFrom?: number
  activeTo?: number
  minDelaySec?: number
  maxDelaySec?: number
  mergeWindowSec?: number
  replyChance?: number
  declineChances?: string[]
}

function buildPersona(bodyRaw: Record<string, unknown> | null): string {
  const body = bodyRaw ?? {}
  const persona: PersonaInput = {
    tagline: String(body.tagline ?? '').slice(0, 200),
    style: String(body.style ?? '').slice(0, 2000),
    activeFrom: clamp(Number(body.activeFrom ?? 5), 0, 23),
    activeTo: clamp(Number(body.activeTo ?? 17), 0, 24),
    minDelaySec: clamp(Number(body.minDelaySec ?? 20), 3, 3600),
    maxDelaySec: clamp(Number(body.maxDelaySec ?? 90), 5, 7200),
    mergeWindowSec: clamp(Number(body.mergeWindowSec ?? 7), 2, 120),
    replyChance: Math.min(1, Math.max(0, Number(body.replyChance ?? 0.9))),
    declineChances: Array.isArray(body.declineChances)
      ? (body.declineChances as unknown[]).map((d) => String(d).slice(0, 300)).filter(Boolean).slice(0, 6)
      : [],
  }
  return JSON.stringify(persona)
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** GET all AI agents. */
export async function GET() {
  try {
    await requireAdminUser()
    const agents = await db.user.findMany({
      where: { isAI: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, role: true, avatar: true, coins: true, money: true,
        headline: true, bio: true, city: true, subjects: true, feeMin: true, feeMax: true,
        isAI: true, aiPersona: true, status: true, createdAt: true,
      },
    })
    return NextResponse.json({ agents })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** POST create an AI teacher / AI student (owner-only). */
export async function POST(req: NextRequest) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
    const role = body?.role === 'TEACHER' ? 'TEACHER' : body?.role === 'STUDENT' ? 'STUDENT' : null
    if (!name || !role) return NextResponse.json({ error: 'name and role (TEACHER|STUDENT) are required' }, { status: 400 })

    const email = `ai.${name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || Date.now()}@ai.studysir.app`
    const user = await db.user.create({
      data: {
        email,
        name,
        role,
        password: null,
        isAI: true,
        coins: role === 'TEACHER' ? Math.max(0, clamp(Number(body?.coins ?? 100), 0, 100000)) : 0,
        headline: role === 'TEACHER' ? String(body?.headline ?? 'AI Teacher').slice(0, 120) : null,
        bio: typeof body?.bio === 'string' ? body.bio.slice(0, 2000) : null,
        city: typeof body?.city === 'string' ? body.city.slice(0, 80) : null,
        country: typeof body?.country === 'string' && body.country ? body.country.slice(0, 80) : 'Pakistan',
        avatar: typeof body?.avatar === 'string' && body.avatar.startsWith('data:image/') ? body.avatar : null,
        subjects: typeof body?.subjects === 'string' ? body.subjects.slice(0, 300) : null,
        feeMin: role === 'TEACHER' ? Number(body?.feeMin) || 0 : null,
        feeMax: role === 'TEACHER' ? Number(body?.feeMax) || 0 : null,
        aiPersona: buildPersona(body),
      },
    })

    // AI teachers keep the feed alive: optionally auto-post a tuition request? (kept manual for now)
    await notify(user.id, 'SYSTEM', 'AI agent created', `${name} is live on StudySir as an AI ${role === 'TEACHER' ? 'teacher' : 'student'}.`)

    return NextResponse.json({ agent: { id: user.id } }, { status: 201 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
