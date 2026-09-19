/**
 * Premium teacher plans (requirement: pricing + affiliate program).
 * Prices are in PKR — the base money currency (display converts via currency rates).
 *
 * Affiliate rules (per product spec):
 * - BASIC: buyer pays only 2,500 through an affiliate link (Rs 500 less),
 *   affiliate earns Rs 500, platform keeps Rs 2,000.
 * - PRO / ACADEMY: price unchanged through an affiliate link;
 *   affiliate earns Rs 700 / Rs 1,000 respectively.
 *
 * "Paid teachers" = teachers with an ACTIVE PlanPurchase (any tier) —
 * they are the ones who count toward the 1,000 paid-teachers milestone.
 */
export type PlanTier = 'BASIC' | 'PRO' | 'ACADEMY'

export interface PlanDef {
  tier: PlanTier
  name: string
  price: number // regular PKR price
  coins: number // coins granted on purchase
  affiliatePrice: number // PKR the buyer pays when coming through an affiliate link
  affiliateCommission: number // PKR credited to the affiliate on approval
  discountPct: number | null // regular-price discount chip (e.g. 5% Off)
  popular: boolean
  features: string[]
}

const CORE_FEATURES = [
  'Ads Free',
  'Live Chat any student',
  'Teach all over the world',
  'Post Your Courses',
  'Manage Your Calendar',
  'Sell Your Courses',
  'Sell Ebooks',
  'StudySir Team Support',
]

export const PREMIUM_PLANS: PlanDef[] = [
  {
    tier: 'BASIC',
    name: 'Basic Plan',
    price: 3000,
    coins: 3000,
    affiliatePrice: 2500,
    affiliateCommission: 500,
    discountPct: null,
    popular: false,
    features: ['3,000 Coins', ...CORE_FEATURES],
  },
  {
    tier: 'PRO',
    name: 'Pro Plan',
    price: 5699,
    coins: 6000,
    affiliatePrice: 5699,
    affiliateCommission: 700,
    discountPct: 5,
    popular: true,
    features: ['6,000 Coins', ...CORE_FEATURES],
  },
  {
    tier: 'ACADEMY',
    name: 'Academy Plan',
    price: 9999,
    coins: 12000,
    affiliatePrice: 9999,
    affiliateCommission: 1000,
    discountPct: 17,
    popular: false,
    features: ['12,000 Coins', ...CORE_FEATURES],
  },
]

export function planByTier(tier: string): PlanDef | undefined {
  return PREMIUM_PLANS.find((p) => p.tier === tier)
}

/** Price the buyer pays for a tier (affiliate-discounted when a valid referral is attached). */
export function priceFor(tier: string, viaAffiliate: boolean): number {
  const plan = planByTier(tier)
  if (!plan) return 0
  return viaAffiliate ? plan.affiliatePrice : plan.price
}

/** Tiers ranked low → high (used to show the user's best active plan). */
const TIER_RANK: Record<PlanTier, number> = { BASIC: 1, PRO: 2, ACADEMY: 3 }

export function tierRank(tier: string): number {
  return TIER_RANK[tier as PlanTier] ?? 0
}

/** Generate a unique affiliate referral code ("SS-" + 6 base36 chars). */
export function generateAffiliateCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I/L
  let code = 'SS-'
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}
