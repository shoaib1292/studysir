import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clearSessionUser, setSessionUser, getSessionUser } from '@/lib/session'
import { toUserDTO } from '@/lib/dto'

const TIER_RANK: Record<string, number> = { BASIC: 1, PRO: 2, ACADEMY: 3 }

/** Attach the highest ACTIVE plan tier to a user DTO (paid-teacher badge). */
async function withPlanTier<T extends { id: string }>(dto: T): Promise<T & { planTier: string | null }> {
  const active = await db.planPurchase.findMany({
    where: { userId: dto.id, status: 'ACTIVE' },
    select: { tier: true },
  })
  const planTier = active.reduce<string | null>(
    (best, p) => ((TIER_RANK[p.tier] ?? 0) > (TIER_RANK[best ?? ''] ?? 0) ? p.tier : best),
    null
  )
  return { ...dto, planTier }
}

export async function GET() {
  const user = await getSessionUser()
  const dto = toUserDTO(user)
  return NextResponse.json({ user: dto ? await withPlanTier(dto) : null })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const userId = body?.userId as string | undefined
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.status === 'BANNED') {
    return NextResponse.json(
      { error: 'This account has been suspended for violating platform rules.' },
      { status: 403 }
    )
  }

  await setSessionUser(user.id)
  const dto = toUserDTO(user)
  return NextResponse.json({ user: dto ? await withPlanTier(dto) : null })
}

export async function DELETE() {
  await clearSessionUser()
  return NextResponse.json({ ok: true })
}
