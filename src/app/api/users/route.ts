import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toUserDTO } from '@/lib/dto'

/**
 * Demo quick-login list.
 * Excludes: platform admins (they use the separate Admin Login) and AI agents
 * (they are background actors, not loggable accounts).
 */
export async function GET() {
  const users = await db.user.findMany({
    where: { isAdmin: false, isAI: false },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ users: users.map((u) => toUserDTO(u)) })
}
