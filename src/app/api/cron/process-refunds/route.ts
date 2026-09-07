import { NextResponse } from 'next/server'
import { processExpiredConnections } from '@/lib/coins'

async function run() {
  const processed = await processExpiredConnections()
  return NextResponse.json({ ok: true, processed, ranAt: new Date().toISOString() })
}

export async function GET() {
  return run()
}

export async function POST() {
  return run()
}
