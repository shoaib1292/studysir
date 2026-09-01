import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toUserDTO } from '@/lib/dto'

export async function GET() {
  const users = await db.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ users: users.map((u) => toUserDTO(u)) })
}
