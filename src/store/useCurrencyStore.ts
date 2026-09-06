'use client'

// Global currency state (requirement D): rates fetched once from /api/currency,
// display currency = explicit user preference → region default (country) → PKR.
import { create } from 'zustand'
import { api } from '@/lib/api'
import {
  FALLBACK_RATES,
  currencyForCountry,
  formatMoney as fmt,
  isCurrencyCode,
  type CurrencyCode,
  type ExchangeRateDTO,
} from '@/lib/currency'
import type { UserDTO } from '@/lib/types'

interface CurrencyState {
  rates: ExchangeRateDTO[]
  /** explicit user choice (persisted to the profile) */
  preferred: CurrencyCode | null
  loaded: boolean
  load: (me: UserDTO | null) => Promise<void>
  setPreferred: (code: CurrencyCode, meId?: string) => void
}

const LS_KEY = 'ss-currency'

export const useCurrencyStore = create<CurrencyState>((set) => ({
  rates: FALLBACK_RATES,
  preferred: null,
  loaded: false,
  load: async (me) => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null
    const preferred = isCurrencyCode(saved) ? saved : isCurrencyCode(me?.currency) ? (me.currency as CurrencyCode) : null
    set({ preferred })
    try {
      const { rates } = await api.getRates()
      set({ rates: rates as ExchangeRateDTO[], loaded: true })
    } catch {
      set({ loaded: true }) // keep fallback rates
    }
  },
  setPreferred: (code, meId) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(LS_KEY, code)
    set({ preferred: code })
    if (meId) void api.updateProfile(meId, { currency: code }).catch(() => undefined)
  },
}))

/** The currency this user should see: explicit preference → country default → PKR. */
export function useDisplayCurrency(me: UserDTO | null | undefined): ExchangeRateDTO {
  const rates = useCurrencyStore((s) => s.rates)
  const preferred = useCurrencyStore((s) => s.preferred)
  if (preferred) return rates.find((r) => r.code === preferred) ?? FALLBACK_RATES[0]
  const byCountry = currencyForCountry(me?.country)
  return rates.find((r) => r.code === byCountry) ?? FALLBACK_RATES[0]
}

/** Hook returning a money formatter bound to the viewer's display currency. */
export function useMoney(me: UserDTO | null | undefined) {
  const rate = useDisplayCurrency(me)
  return {
    rate,
    /** format a PKR-base amount in the viewer's currency */
    fmt: (pkr: number, opts?: { compact?: boolean }) => fmt(pkr, rate, opts),
  }
}
