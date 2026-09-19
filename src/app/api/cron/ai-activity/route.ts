import { NextResponse } from 'next/server'
import { aiBrowseAndEngage, aiActivityStats } from '@/lib/ai-activity'

/**
 * Cron-style trigger for the AI activity engine.
 *
 *   GET  /api/cron/ai-activity   → runs once, returns stats
 *   POST /api/cron/ai-activity   → same, callable from the admin AI tab
 *
 * Unprotected on purpose (cron-style) so the admin UI / external scheduler
 * can fire it. Each run is logged to the server console.
 */
async function run() {
  const startedAt = new Date().toISOString()
  console.log(`[ai-activity] cron run @ ${startedAt}`)
  const stats = await aiBrowseAndEngage()
  console.log(
    `[ai-activity] run done — checked=${stats.agentsChecked} actions=${stats.actionsTaken} ` +
      `likes=${stats.byType.likes} reviews=${stats.byType.reviews} questions=${stats.byType.questions} tuitions=${stats.byType.tuitions}`
  )
  return NextResponse.json({ ok: true, stats: aiActivityStats() })
}

export async function GET() {
  return run()
}

export async function POST() {
  return run()
}
