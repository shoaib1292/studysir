'use client'

import { useEffect, useState } from 'react'
import { BadgeDollarSign, Coins, GraduationCap, Handshake, Undo2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import type { CoinTransactionDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { clientCoinCost } from '../shared/constants'
import { FbCard } from '../shared/bits'

/* Alpha-based icon chips so they stay readable on light AND dark surfaces. */
const INFO_CARDS: Array<{ icon: LucideIcon; color: string; title: string; body: string }> = [
  {
    icon: GraduationCap,
    color: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400',
    title: 'Free tuition posts',
    body: 'Students & parents post tuition requests for free. Posting never costs a single coin.',
  },
  {
    icon: Coins,
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    title: 'Weighted contact cost',
    body: 'Teachers spend 5–50 coins to approach a tuition — cost scales with fee range and mode (home tuition weighs more).',
  },
  {
    icon: Undo2,
    color: 'bg-green-500/15 text-green-600 dark:text-green-400',
    title: 'Fair refunds',
    body: 'Rejected before any chat = full refund · no reply within 10 days = auto refund · rejected after chat started = no refund.',
  },
  {
    icon: Handshake,
    color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    title: 'Hire keeps value',
    body: 'On hire, the spent coins keep the platform running — quality teachers reach real students.',
  },
]

export function MonetizeView() {
  const me = useAppStore((s) => s.me)!
  const isTeacher = me.role === 'TEACHER'

  const [transactions, setTransactions] = useState<CoinTransactionDTO[] | null>(null)

  useEffect(() => {
    if (!isTeacher) return
    api
      .getWallet()
      .then((d) => setTransactions(d.transactions))
      .catch(() => setTransactions([]))
  }, [isTeacher])

  const hires = (transactions ?? []).filter((t) => t.type.startsWith('HIRE'))
  const hireBonus = hires.reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const exampleCost = clientCoinCost(2500, 6000, 'ONLINE')

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {/* Hero */}
      <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-r from-[#1877F2] to-[#0C63D8] p-6 text-white shadow-md">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20">
          <BadgeDollarSign className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">StudySir Monetize Program</h1>
          <p className="mt-1 text-sm opacity-90">
            Earn &amp; spend wisely — coins power the tuition marketplace
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {INFO_CARDS.map((card) => (
          <FbCard key={card.title} className="p-4">
            <div className="flex items-start gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-full ${card.color}`}>
                <card.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{card.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            </div>
          </FbCard>
        ))}
      </div>

      {/* Coin cost explainer */}
      <FbCard className="p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Coins className="size-4 text-amber-500" />
          How the coin cost is computed
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          base = 5 + average fee (PKR) ÷ 500 · +5 for home tuition · +2 for center tuition · clamped between 5 and 50
          coins.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Example: a PKR 2,500–6,000 online tuition costs about{' '}
          <b className="text-foreground">{exampleCost} coins</b> to accept.
        </p>
      </FbCard>

      {/* Teacher stats */}
      {isTeacher ? (
        <FbCard className="p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Handshake className="size-4 text-[#1877F2]" />
            Your hires
          </p>
          {transactions === null ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/70 p-3 text-center">
                <p className="text-2xl font-bold">{hires.length}</p>
                <p className="text-xs text-muted-foreground">Total hires</p>
              </div>
              <div className="rounded-xl bg-muted/70 p-3 text-center">
                <p className="flex items-center justify-center gap-1 text-2xl font-bold">
                  <Coins className="size-5 text-amber-500" />
                  {hireBonus}
                </p>
                <p className="text-xs text-muted-foreground">Coins moved through hires</p>
              </div>
            </div>
          )}
        </FbCard>
      ) : null}
    </div>
  )
}
