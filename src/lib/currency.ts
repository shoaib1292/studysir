// Multi-currency support (requirement D).
// ALL stored money amounts are in PKR (base currency). Display converts on the fly.
// Admin can edit rates (1 USD = 280 PKR, etc). Users see pricing in their region's currency.

export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'INR'

export interface ExchangeRateDTO {
  code: CurrencyCode
  label: string
  symbol: string
  pkrPer: number
}

/** Fallback rates used before the API responds (1 USD ≈ 280 PKR etc). */
export const FALLBACK_RATES: ExchangeRateDTO[] = [
  { code: 'PKR', label: 'Pakistani Rupee', symbol: 'Rs', pkrPer: 1 },
  { code: 'USD', label: 'US Dollar', symbol: '$', pkrPer: 280 },
  { code: 'EUR', label: 'Euro', symbol: '€', pkrPer: 305 },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', pkrPer: 3.35 },
]

/** country name → default display currency (requirement: Pakistan→PKR, India→INR, Europe→EUR, elsewhere USD). */
const EURO_COUNTRIES = new Set([
  'Austria', 'Belgium', 'Croatia', 'Cyprus', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Portugal',
  'Slovakia', 'Slovenia', 'Spain',
])

export function currencyForCountry(country?: string | null): CurrencyCode {
  const c = (country ?? '').trim().toLowerCase()
  if (!c) return 'PKR'
  if (c.includes('pakistan')) return 'PKR'
  if (c.includes('india')) return 'INR'
  if ([...EURO_COUNTRIES].some((e) => e.toLowerCase() === c)) return 'EUR'
  return 'USD'
}

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return v === 'PKR' || v === 'USD' || v === 'EUR' || v === 'INR'
}

/** Convert a PKR-base amount into the display currency's unit amount. */
export function convertFromPkr(pkr: number, rate: ExchangeRateDTO): number {
  return pkr / (rate.pkrPer || 1)
}

/**
 * Format a PKR-base amount in the target display currency.
 * e.g. formatMoney(2800, { code:'USD', symbol:'$', pkrPer:280 }) → "$10"
 */
export function formatMoney(pkr: number, rate: ExchangeRateDTO, opts?: { compact?: boolean }): string {
  const value = convertFromPkr(pkr, rate)
  const decimals = rate.code === 'PKR' || rate.code === 'INR' ? 0 : value >= 100 ? 0 : value % 1 === 0 ? 0 : 2
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...(opts?.compact && value >= 10000 ? { notation: 'compact', maximumFractionDigits: 1 } : {}),
  })
  return `${rate.symbol.length > 1 ? rate.symbol + ' ' : rate.symbol}${formatted}`
}

export const MIN_WITHDRAW_PKR = 1000
