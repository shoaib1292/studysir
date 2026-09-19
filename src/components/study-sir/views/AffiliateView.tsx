'use client'

// Affiliate Program view (requirement H): join flow, referral link sharing,
// commission table per plan and a lifetime earnings ledger.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Banknote,
  Check,
  Copy,
  Info,
  Link2,
  Loader2,
  MessageCircle,
  ReceiptText,
  RotateCw,
  Share2,
  ShoppingBag,
  UsersRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, errorMessage } from '@/lib/api'
import type { AffiliateDTO, PlanDTO, PlanTier } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { FbCard } from '../shared/bits'
import { timeAgo } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'
import { UserAvatar } from '../shared/UserAvatar'

const TIER_ORDER: Record<PlanTier, number> = { BASIC: 0, PRO: 1, ACADEMY: 2 }

/* Alpha-based chips so they stay readable in light AND dark mode. */
const TIER_CHIP: Record<string, string> = {
  BASIC: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400',
  PRO: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  ACADEMY: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
}

const SHARE_TEXT = 'Join StudySir — learn or teach: '

const STEPS = [
  'Share your link with friends/students.',
  'They buy a Basic/Pro/Academy plan through it.',
  'After the platform verifies the payment, your commission lands in your Money Wallet — withdraw it anytime (min PKR 1,000).',
]

export function AffiliateView() {
  const nonce = useAppStore((s) => s.nonce)
  const me = useAppStore((s) => s.me)
  const refreshMe = useAppStore((s) => s.refreshMe)
  const { fmt } = useMoney(me)

  const [affiliate, setAffiliate] = useState<AffiliateDTO | null>(null)
  const [plans, setPlans] = useState<PlanDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)
  /** Browser-only environment (SSR-safe): origin for the full link + native share support. */
  const [env, setEnv] = useState<{ origin: string; canShare: boolean }>({ origin: '', canShare: false })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [aff, pl] = await Promise.all([api.getAffiliate(), api.getPlans()])
      setAffiliate(aff)
      setPlans([...pl.plans].sort((a, b) => (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99)))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, nonce])

  useEffect(() => {
    setEnv({ origin: window.location.origin, canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function' })
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  const joined = Boolean(affiliate?.joined && affiliate.code)
  const fullLink = affiliate?.link ? env.origin + affiliate.link : ''
  const waHref = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + fullLink)}`

  async function join() {
    if (joining) return
    setJoining(true)
    try {
      const d = await api.joinAffiliate()
      toast.success('You are in!', { description: 'Your referral code is ' + d.code })
      const fresh = await api.getAffiliate()
      setAffiliate(fresh)
      void refreshMe()
    } catch (e) {
      toast.error('Could not join the program', { description: errorMessage(e) })
    } finally {
      setJoining(false)
    }
  }

  async function copyLink() {
    if (!fullLink) return
    try {
      await navigator.clipboard.writeText(fullLink)
      setCopied(true)
      toast.success('Referral link copied', {
        description: 'Paste it in WhatsApp, Facebook or your class group.',
      })
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed — select the link and copy it manually.')
    }
  }

  function openWhatsApp() {
    window.open(waHref, '_blank', 'noopener,noreferrer')
  }

  async function nativeShare() {
    if (!fullLink) return
    try {
      await navigator.share({ title: 'StudySir', text: SHARE_TEXT, url: fullLink })
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-5" aria-busy="true" aria-label="Loading affiliate program">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !affiliate) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <EmptyState
          icon={UsersRound}
          title="Couldn't load the affiliate program"
          hint={error ?? 'Something went wrong. Please try again.'}
          action={
            <Button className="mt-2" size="sm" onClick={() => void load()}>
              <RotateCw className="mr-1.5 size-4" /> Try again
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* HERO */}
      <FbCard className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#1877F2]/10">
            <UsersRound className="size-6 text-[#1877F2] dark:text-blue-400" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">Affiliate Program</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Share your link. When someone buys a premium plan through it, you earn cash — straight into your Money
              Wallet.
            </p>
          </div>
        </div>
      </FbCard>

      {/* COMMISSION TABLE */}
      <FbCard className="p-5 sm:p-6">
        <h2 className="font-bold">Commission per plan</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What a buyer pays through your link — and what you pocket when it&apos;s verified.
        </p>
        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Buyer pays</TableHead>
                <TableHead className="text-right">You earn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.tier}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', TIER_CHIP[p.tier])}>
                        {p.tier}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(p.affiliatePrice)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmt(p.affiliateCommission)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </FbCard>

      {/* JOIN CTA — not joined yet */}
      {!joined ? (
        <FbCard className="p-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#1877F2]/10">
            <Link2 className="size-7 text-[#1877F2] dark:text-blue-400" aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-lg font-bold">Join the program</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Get your personal referral code and earn a cash commission every time someone buys a premium plan through
            your link.
          </p>
          <Button className="mt-4" size="lg" onClick={() => void join()} disabled={joining}>
            {joining ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Link2 className="mr-1.5 size-4" aria-hidden="true" />
            )}
            {joining ? 'Creating your code…' : 'Get my referral link'}
          </Button>
        </FbCard>
      ) : (
        <>
          {/* YOUR REFERRAL LINK */}
          <FbCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-bold">Your referral link</h2>
              <span
                className="rounded-lg bg-[#1877F2]/10 px-3 py-1 font-mono text-xl font-bold tracking-wide text-[#1877F2] dark:text-blue-400"
                aria-label={`Referral code ${affiliate.code ?? ''}`}
              >
                {affiliate.code}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={fullLink}
                aria-label="Your referral link"
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void copyLink()} aria-label="Copy referral link">
                  {copied ? (
                    <Check className="mr-1.5 size-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Copy className="mr-1.5 size-4" aria-hidden="true" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={openWhatsApp}
                  aria-label="Share on WhatsApp"
                >
                  <MessageCircle className="mr-1.5 size-4" aria-hidden="true" /> WhatsApp
                </Button>
                {env.canShare ? (
                  <Button variant="outline" onClick={() => void nativeShare()} aria-label="Share referral link">
                    <Share2 className="mr-1.5 size-4" aria-hidden="true" /> Share
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Anyone opening this link signs up with you attached — their verified plan purchases credit your wallet.
            </p>
          </FbCard>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4">
            <FbCard className="p-5">
              <span className="grid size-10 place-items-center rounded-full bg-emerald-500/15">
                <Banknote className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </span>
              <p className="mt-3 text-2xl font-extrabold tabular-nums">{fmt(affiliate.lifetimeEarnings)}</p>
              <p className="text-sm text-muted-foreground">Lifetime earnings</p>
            </FbCard>
            <FbCard className="p-5">
              <span className="grid size-10 place-items-center rounded-full bg-[#1877F2]/10">
                <ShoppingBag className="size-5 text-[#1877F2] dark:text-blue-400" aria-hidden="true" />
              </span>
              <p className="mt-3 text-2xl font-extrabold tabular-nums">{affiliate.sales}</p>
              <p className="text-sm text-muted-foreground">Plan sales</p>
            </FbCard>
          </div>

          {/* EARNINGS LEDGER */}
          <FbCard className="p-4">
            <p className="pb-2 font-bold">Earnings ledger</p>
            {affiliate.earnings.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={ReceiptText}
                  title="No sales yet — share your link to get started"
                  hint="Every verified plan purchase made through your referral link shows up here with your commission."
                />
              </div>
            ) : (
              <div className="max-h-96 divide-y overflow-y-auto [scrollbar-width:thin]">
                {affiliate.earnings.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5">
                    <UserAvatar
                      src={e.buyer?.avatar ?? null}
                      name={e.buyer?.name ?? 'StudySir buyer'}
                      className="size-9"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.buyer?.name ?? 'A StudySir buyer'}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(e.createdAt)}</p>
                    </div>
                    {e.tier ? (
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', TIER_CHIP[e.tier])}>
                        {e.tier}
                      </span>
                    ) : null}
                    <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{fmt(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </FbCard>
        </>
      )}

      {/* HOW IT WORKS */}
      <FbCard className="p-5 sm:p-6">
        <h2 className="font-bold">How it works</h2>
        <ol className="mt-3 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-start gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#1877F2] text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm text-foreground/90">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-[#1877F2] dark:text-blue-400" aria-hidden="true" />
          <span>
            Basic plan buyers pay only Rs 2,500 through your link (Rs 500 less) — you still earn the full Rs 500.
          </span>
        </p>
      </FbCard>
    </div>
  )
}
