import { db } from '@/lib/db'
import { FALLBACK_RATES } from '@/lib/currency'

/** Read a platform setting (string). Returns null when unset. */
export async function getSetting(key: string): Promise<string | null> {
  const row = await db.platformSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function setSetting(key: string, value: string) {
  await db.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

/** Platform commission on digital-good sales, 0–0.5 (default 10%). */
export async function getCommissionRate(): Promise<number> {
  const raw = await getSetting('commissionRate')
  const n = raw === null ? NaN : Number(raw)
  return Number.isFinite(n) ? Math.min(0.5, Math.max(0, n)) : 0.1
}

export const MILESTONE_PAID_TEACHERS = 1000

/** Exchange rates (admin-editable). Ensures all four codes exist — seeds defaults on first read. */
export async function getRates() {
  const existing = await db.exchangeRate.findMany()
  if (existing.length < FALLBACK_RATES.length) {
    for (const r of FALLBACK_RATES) {
      await db.exchangeRate.upsert({
        where: { code: r.code },
        create: { code: r.code, label: r.label, symbol: r.symbol, pkrPer: r.pkrPer },
        update: {},
      })
    }
    return db.exchangeRate.findMany({ orderBy: { code: 'asc' } })
  }
  return existing.sort((a, b) => a.code.localeCompare(b.code))
}
