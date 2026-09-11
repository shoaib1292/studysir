import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { TEACHER_SIGNUP_COINS } from '@/lib/coins'
import { generateEmailCode, sendVerificationEmail, EMAIL_CODE_TTL_MS } from '@/lib/email'

/**
 * Create a real account (students/parents/teachers).
 * - Email verification is required before login (OTP sent to the email).
 * - Students/parents: NO coins — money wallet only (top-up via admin-verified payments).
 * - Teachers: welcome coin grant so they can accept requests.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  const role = String(body?.role ?? 'STUDENT').toUpperCase()

  if (!name || name.length < 2) return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  if (!['STUDENT', 'PARENT', 'TEACHER'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

  const isTeacher = role === 'TEACHER'
  const code = generateEmailCode()

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashPassword(password),
      role,
      coins: isTeacher ? TEACHER_SIGNUP_COINS : 0, // students never get coins
      money: 0,
      headline: isTeacher ? 'New Teacher on StudySir' : role === 'PARENT' ? 'Parent' : 'Student',
      country: 'Pakistan',
      emailVerified: false,
      emailVerificationCode: code,
      emailVerificationCodeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
    },
  })

  try {
    await sendVerificationEmail(email, code)
  } catch (e) {
    console.error('[signup] verification email send failed', e)
  }

  return NextResponse.json({ requireEmailVerification: true, email: user.email }, { status: 201 })
}
