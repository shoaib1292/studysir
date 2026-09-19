import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionUser } from '@/lib/session'
import { toUserDTO } from '@/lib/dto'

/**
 * Verify a signup email with the 6-digit OTP and create the session.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const code = String(body?.code ?? '').trim()

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  if (user.emailVerified) {
    await setSessionUser(user.id)
    return NextResponse.json({ user: toUserDTO(user) })
  }

  const valid =
    user.emailVerificationCode &&
    user.emailVerificationCode === code &&
    user.emailVerificationCodeExpiresAt &&
    user.emailVerificationCodeExpiresAt.getTime() > Date.now()

  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationCodeExpiresAt: null,
    },
  })

  await setSessionUser(updated.id)
  return NextResponse.json({ user: toUserDTO(updated) })
}
