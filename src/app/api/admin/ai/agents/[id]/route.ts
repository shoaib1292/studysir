import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser, HttpError } from '@/lib/session'

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** PATCH an AI agent: profile fields, persona, avatar, coin funding (owner-only). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await ctx.params
    const agent = await db.user.findUnique({ where: { id } })
    if (!agent || !agent.isAI) return NextResponse.json({ error: 'AI agent not found' }, { status: 404 })

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const data: Record<string, unknown> = {}

    if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 80)
    if (typeof body?.avatar === 'string' && body.avatar.startsWith('data:image/')) data.avatar = body.avatar
    if (typeof body?.headline === 'string') data.headline = body.headline.slice(0, 120)
    if (typeof body?.bio === 'string') data.bio = body.bio.slice(0, 2000)
    if (typeof body?.city === 'string') data.city = body.city.slice(0, 80)
    if (typeof body?.subjects === 'string') data.subjects = body.subjects.slice(0, 300)
    if (body?.feeMin !== undefined) data.feeMin = Number(body.feeMin) || 0
    if (body?.feeMax !== undefined) data.feeMax = Number(body.feeMax) || 0

    // coin funding (grant, not set — keeps ledger sane)
    const grantCoins = Number(body?.grantCoins)
    if (Number.isFinite(grantCoins) && grantCoins > 0) {
      data.coins = { increment: Math.min(100000, Math.round(grantCoins)) }
    }

    // persona rebuild
    if (body?.persona && typeof body.persona === 'object') {
      const p = body.persona as Record<string, unknown>
      data.aiPersona = JSON.stringify({
        tagline: String(p.tagline ?? '').slice(0, 200),
        style: String(p.style ?? '').slice(0, 2000),
        activeFrom: clamp(Number(p.activeFrom ?? 5), 0, 23),
        activeTo: clamp(Number(p.activeTo ?? 17), 0, 24),
        minDelaySec: clamp(Number(p.minDelaySec ?? 20), 3, 3600),
        maxDelaySec: clamp(Number(p.maxDelaySec ?? 90), 5, 7200),
        mergeWindowSec: clamp(Number(p.mergeWindowSec ?? 7), 2, 120),
        replyChance: Math.min(1, Math.max(0, Number(p.replyChance ?? 0.9))),
        declineChances: Array.isArray(p.declineChances)
          ? (p.declineChances as unknown[]).map((d) => String(d).slice(0, 300)).filter(Boolean).slice(0, 6)
          : [],
      })
    }

    const updated = await db.user.update({ where: { id }, data })

    return NextResponse.json({
      agent: { id: updated.id, name: updated.name, coins: updated.coins, avatar: updated.avatar },
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** DELETE an AI agent (owner-only). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser({ ownerOnly: true })
    const { id } = await ctx.params
    const agent = await db.user.findUnique({ where: { id } })
    if (!agent || !agent.isAI) return NextResponse.json({ error: 'AI agent not found' }, { status: 404 })
    await db.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
