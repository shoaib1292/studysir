import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { PREMIUM_PLANS } from '@/lib/plans'

/**
 * GET /api/plans — premium plan catalog + the caller's current state.
 * Used by the Pricing screen. Public contract requires a session (in-app view).
 */
export async function GET() {
  try {
    const me = await requireSessionUser()

    // Highest active tier wins (BASIC < PRO < ACADEMY)
    const active = await db.planPurchase.findMany({
      where: { userId: me.id, status: 'ACTIVE' },
      select: { tier: true },
    })
    const rank: Record<string, number> = { BASIC: 1, PRO: 2, ACADEMY: 3 }
    const myPlanTier = active.reduce<string | null>(
      (best, p) => ((rank[p.tier] ?? 0) > (rank[best ?? ''] ?? 0) ? p.tier : best),
      null
    )

    return NextResponse.json({
      plans: PREMIUM_PLANS,
      myPlanTier,
      affiliateCode: me.affiliateCode,
      role: me.role,
    })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
