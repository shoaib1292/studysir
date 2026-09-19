import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateEmailCode, sendVerificationEmail, EMAIL_CODE_TTL_MS } from '@/lib/email'

/**
 * Resend a signup verification code. Does not reveal whether the email exists.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true })
  }

  const code = generateEmailCode()
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerificationCode: code,
      emailVerificationCodeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
    },
  })

  try {
    await sendVerificationEmail(email, code)
  } catch (e) {
    console.error('[resend-verification] email send failed', e)
    return NextResponse.json({ error: 'Could not send the email — try again shortly' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
