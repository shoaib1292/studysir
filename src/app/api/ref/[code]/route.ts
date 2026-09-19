import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PREMIUM_PLANS } from '@/lib/plans'

/**
 * GET /api/ref/:code — PUBLIC resolver for affiliate invite links (no session).
 * Returns the referrer's public identity + the premium plan catalog so the
 * logged-out referral landing page can render the discounted offer.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const clean = code.trim().toUpperCase()
  if (!/^[A-Z0-9-]{2,20}$/.test(clean)) return NextResponse.json({ valid: false })

  const referrer = await db.user.findFirst({
    where: { affiliateCode: clean, status: 'ACTIVE' },
    select: { name: true, avatar: true },
  })
  if (!referrer) return NextResponse.json({ valid: false })

  return NextResponse.json({ valid: true, referrer, plans: PREMIUM_PLANS })
}
