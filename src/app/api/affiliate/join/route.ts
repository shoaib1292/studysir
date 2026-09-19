import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSessionUser, HttpError } from '@/lib/session'
import { generateAffiliateCode } from '@/lib/plans'
import { notify } from '@/lib/coins'

/** POST /api/affiliate/join — generate the caller's unique referral code (idempotent). */
export async function POST() {
  try {
    const me = await requireSessionUser()

    if (me.affiliateCode) {
      return NextResponse.json({ joined: true, code: me.affiliateCode })
    }

    // Retry on the (rare) unique collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateAffiliateCode()
      try {
        const updated = await db.user.update({
          where: { id: me.id },
          data: { affiliateCode: code },
          select: { affiliateCode: true },
        })
        await notify(
          me.id,
          'SYSTEM',
          'Welcome to the Affiliate Program 🤝',
          `Your referral code is ${updated.affiliateCode}. Share your link — you earn Rs 500 / 700 / 1,000 per Basic / Pro / Academy plan sale.`,
          'affiliate'
        )
        return NextResponse.json({ joined: true, code: updated.affiliateCode })
      } catch (err) {
        // P2002 = unique violation — regenerate and retry
        const isUnique = (err as { code?: string })?.code === 'P2002'
        if (!isUnique) throw err
      }
    }
    return NextResponse.json({ error: 'Could not generate a code — try again' }, { status: 500 })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
