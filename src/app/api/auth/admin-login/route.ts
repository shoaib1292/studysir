import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSessionUser } from '@/lib/session'
import { verifyPassword } from '@/lib/password'
import { toUserDTO } from '@/lib/dto'

/**
 * SEPARATE platform-admin login (requirement J).
 * Only accounts with isAdmin=true can authenticate here — normal users get 403
 * with a hint, so the admin entry is fully detached from the user login.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.isAdmin || !verifyPassword(password, user.password)) {
    // deliberately vague — do not reveal whether the account exists
    return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 })
  }
  if (user.status === 'BANNED') {
    return NextResponse.json({ error: 'This admin account is suspended.' }, { status: 403 })
  }

  await setSessionUser(user.id)
  return NextResponse.json({ user: toUserDTO(user) })
}
