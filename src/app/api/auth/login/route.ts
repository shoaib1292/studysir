import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionUser } from '@/lib/session'
import { verifyPassword } from '@/lib/password'
import { toUserDTO } from '@/lib/dto'

/**
 * Normal user login (email + password).
 * Students/parents log in here; admins MUST use the separate admin entry.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  if (user.isAI) {
    return NextResponse.json({ error: 'AI accounts cannot log in' }, { status: 403 })
  }
  if (user.isAdmin) {
    return NextResponse.json(
      { error: 'This is a platform-admin account — use the Admin Login.' },
      { status: 403 }
    )
  }
  if (user.status === 'BANNED') {
    return NextResponse.json(
      { error: 'This account has been suspended for violating platform rules.' },
      { status: 403 }
    )
  }

  await setSessionUser(user.id)
  return NextResponse.json({ user: toUserDTO(user) })
}
