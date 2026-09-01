import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clearSessionUser, setSessionUser, getSessionUser } from '@/lib/session'
import { toUserDTO } from '@/lib/dto'

export async function GET() {
  const user = await getSessionUser()
  return NextResponse.json({ user: toUserDTO(user) })
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
  return NextResponse.json({ user: toUserDTO(user) })
}

export async function DELETE() {
  await clearSessionUser()
  return NextResponse.json({ ok: true })
}
