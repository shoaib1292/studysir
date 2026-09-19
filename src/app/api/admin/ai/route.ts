import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { aiStats } from '@/lib/ai'

/** Admin-only diagnostics for the AI agent system. */
export async function GET() {
  const me = await getSessionUser()
  if (!me?.isAdmin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  return NextResponse.json(await aiStats())
}
