'use client'

// Premium Plans (Task 18-a): plan cards styled like the pricing screenshot plus a
// PaymentDialog-style bank-transfer purchase flow (screenshot proof required).
// Coins are credited instantly on submit and clawed back if verification fails.
// An affiliate referral ('ss_ref' in localStorage) unlocks discounted affiliate pricing.

import { useCallback, useEffect, useState } from 'react'
import {
  BadgePercent,
  Check,
  Coins,
  Copy,
  Crown,
  ImagePlus,
  Info,
  Landmark,
  Loader2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import { fileToCompactDataUrl } from '@/lib/image'
import type { BankAccountDTO, PlanDTO, PlanTier } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { EmptyState } from '../shared/EmptyState'

interface PlansData {
  plans: PlanDTO[]
  myPlanTier: string | null
  affiliateCode: string | null
  role: string
}

type MoneyFmt = (pkr: number) => string

/** Big price row: affiliate deal shows the discounted price with the regular one struck through. */
function PriceRow({ plan, refActive, fmt }: { plan: PlanDTO; refActive: boolean; fmt: MoneyFmt }) {
  const affiliateDeal = refActive && plan.affiliatePrice < plan.price
  const main = affiliateDeal ? plan.affiliatePrice : plan.price
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight">{fmt(main)}</span>
        {affiliateDeal ? <span className="text-base text-muted-foreground line-through">{fmt(plan.price)}</span> : null}
        {plan.discountPct ? (
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-bold text-green-600 dark:text-green-400">
            {plan.discountPct}% Off
          </span>
        ) : null}
      </div>
      {affiliateDeal ? (
        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
          <BadgePercent className="size-3.5 shrink-0" />
          Affiliate price — you save {fmt(plan.price - plan.affiliatePrice)}
        </p>
      ) : null}
      <p className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
        <Coins className="size-3.5 shrink-0 text-amber-500" />
        +{plan.coins} coins on activation
      </p>
    </div>
  )
}

function PlanCard({
  plan,
  current,
  canBuy,
  refActive,
  fmt,
  onBuy,
}: {
  plan: PlanDTO
  current: boolean
  canBuy: boolean
  refActive: boolean
  fmt: MoneyFmt
  onBuy: () => void
}) {
  const popular = plan.popular
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-card p-5 sm:p-6',
        popular && 'border-[#1877F2] ring-1 ring-[#1877F2]'
      )}
    >
      {popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1877F2] px-3 py-1 text-xs font-bold text-white shadow-sm">
          Most Popular
        </span>
      ) : null}

      <h2 className="text-2xl font-extrabold tracking-tight">{plan.name}</h2>
      <hr className="my-4 border-border" />

      <ul className="space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <PriceRow plan={plan} refActive={refActive} fmt={fmt} />
        <div className="mt-5 space-y-1.5">
          <Button
            variant={popular ? 'default' : 'outline'}
            className={cn('w-full', popular && 'bg-[#1877F2] text-white hover:bg-[#166fe5]')}
            disabled={current || !canBuy}
            onClick={onBuy}
          >
            {current ? (
              <>
                Current plan <Check className="ml-1 size-4" />
              </>
            ) : (
              'Buy Now'
            )}
          </Button>
          {!canBuy ? <p className="text-center text-xs text-muted-foreground">Only teachers can buy plans</p> : null}
        </div>
      </div>
    </div>
  )
}

/** Bank-transfer purchase dialog — mirrors PaymentDialog (accounts → screenshot → reference). */
function PurchaseDialog({
  plan,
  refCode,
  onOpenChange,
  onPurchased,
}: {
  plan: PlanDTO
  refCode?: string
  onOpenChange: (o: boolean) => void
  onPurchased: (tier: PlanTier) => void
}) {
  const me = useAppStore((s) => s.me)!
  const refreshMe = useAppStore((s) => s.refreshMe)
  const { fmt } = useMoney(me)

  const [accounts, setAccounts] = useState<BankAccountDTO[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  const finalPrice = refCode ? plan.affiliatePrice : plan.price

  useEffect(() => {
    let cancelled = false
    api
      .getBankAccounts()
      .then((d) => {
        if (!cancelled) setAccounts(d.accounts)
      })
      .catch(() => {
        if (!cancelled) setAccounts([])
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function pickScreenshot(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await fileToCompactDataUrl(file)
      setScreenshot(dataUrl)
    } catch (e) {
      toast.error('Could not read screenshot', { description: errorMessage(e) })
    }
  }

  function copyAccount(value: string) {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(value)
        setTimeout(() => setCopied(''), 1500)
      })
      .catch(() => toast.error('Copy failed'))
  }

  async function submit() {
    if (!method) return toast.error('Select the account you paid from')
    if (!screenshot) return toast.error('Upload the payment screenshot')
    setBusy(true)
    try {
      const res = await api.purchasePlan({
        tier: plan.tier,
        method,
        reference: reference.trim() || undefined,
        screenshot,
        refCode: refCode || undefined,
      })
      toast.success(`${plan.name} activated — +${res.purchase.coinsGranted} coins`, {
        description: 'Verification pending; coins are deducted if verification fails.',
      })
      onPurchased(plan.tier)
      void refreshMe()
      onOpenChange(false)
    } catch (e) {
      toast.error('Purchase failed', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="size-5 text-[#1877F2]" />
            Buy {plan.name} — Bank Transfer
          </DialogTitle>
          <DialogDescription>
            Pay to a platform account and upload the screenshot — your plan activates instantly and is confirmed after
            verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan summary */}
          <div className="rounded-xl border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-bold">
                <Crown className="size-4 shrink-0 text-[#1877F2]" />
                {plan.name}
              </p>
              <p className="text-lg font-extrabold">{fmt(finalPrice)}</p>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Coins className="size-3.5 shrink-0 text-amber-500" />
              +{plan.coins} coins added to your wallet
            </p>
            {refCode ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                <BadgePercent className="size-3.5 shrink-0" />
                Affiliate price applied via {refCode}
              </p>
            ) : null}
          </div>

          {/* Step 1 — platform accounts */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">1 · Select the account you paid from</p>
            {loadingAccounts ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Loading accounts…
              </p>
            ) : accounts.length === 0 ? (
              <p className="rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
                No payment accounts published yet — please check back soon.
              </p>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setMethod(`${acc.bankName} · ${acc.accountNumber}`)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                      method === `${acc.bankName} · ${acc.accountNumber}`
                        ? 'border-[#1877F2] bg-blue-500/5 ring-1 ring-[#1877F2]'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-green-500/15">
                      <Landmark className="size-4 text-green-600 dark:text-green-400" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{acc.bankName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {acc.accountTitle} · <span className="font-mono">{acc.accountNumber}</span>
                      </span>
                      {acc.instructions ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{acc.instructions}</span>
                      ) : null}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Copy ${acc.bankName} account number`}
                      onClick={(e) => {
                        e.stopPropagation()
                        copyAccount(acc.accountNumber)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          copyAccount(acc.accountNumber)
                        }
                      }}
                      className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {copied === acc.accountNumber ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 — screenshot + optional reference */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">2 · Upload payment screenshot</p>
            {screenshot ? (
              <div className="relative overflow-hidden rounded-xl border">
                <img src={screenshot} alt="Payment screenshot preview" className="max-h-44 w-full object-cover" />
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label="Remove screenshot"
                  className="absolute right-2 top-2 size-8 rounded-full"
                  onClick={() => setScreenshot('')}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed p-5 text-muted-foreground transition-colors hover:bg-muted">
                <ImagePlus className="size-6" />
                <span className="text-sm font-medium">Tap to attach the payment proof</span>
                <span className="text-xs">JPG / PNG screenshot of your transfer receipt</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => void pickScreenshot(e.target.files?.[0])}
                />
              </label>
            )}
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction ID / reference (optional)"
              aria-label="Payment reference"
            />
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-blue-500/5 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#1877F2]" />
            <span>
              You pay <b>{fmt(finalPrice)}</b> — <b>{plan.coins} coins</b> are added instantly after submitting the proof
              — verified later; if verification fails the coins are deducted.
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            className="bg-[#1877F2] text-white hover:bg-[#166fe5]"
            onClick={() => void submit()}
            disabled={busy || !method || !screenshot}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Crown className="mr-1.5 size-4" /> Pay {fmt(finalPrice)} · Get {plan.coins} coins
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PricingView() {
  const me = useAppStore((s) => s.me)!
  const { fmt } = useMoney(me)

  const [data, setData] = useState<PlansData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [refCode, setRefCode] = useState<string | null>(null)
  const [buying, setBuying] = useState<PlanDTO | null>(null)
  const [justBought, setJustBought] = useState<PlanTier | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await api.getPlans()
      setData(d)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const code = typeof window !== 'undefined' ? window.localStorage.getItem('ss_ref') : null
    setRefCode(code)
  }, [load])

  const tier = data?.myPlanTier
  const currentTier = justBought ?? (tier === 'BASIC' || tier === 'PRO' || tier === 'ACADEMY' ? tier : null)
  const canBuy = me.role === 'TEACHER'
  const refActive = Boolean(refCode && data && refCode !== data.affiliateCode)
  const activeRef = refActive ? refCode : null

  function retry() {
    setLoading(true)
    setError(false)
    void load()
  }

  return (
    <section aria-label="Premium plans" className="mx-auto w-full max-w-5xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Crown className="size-6 text-[#1877F2]" />
          Premium Plans
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unlock coins, teach worldwide and sell courses — become a paid teacher.
        </p>
      </div>

      {/* Free-tier info banner */}
      <div className="flex items-start gap-2 rounded-xl border bg-blue-500/5 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-[#1877F2]" />
        <span>
          <span className="font-semibold text-foreground">Free users can use every feature except coin-based actions.</span>{' '}
          A plan makes you a paid teacher.
        </span>
      </div>

      {/* Active affiliate referral */}
      {activeRef ? (
        <div className="flex items-start gap-2 rounded-xl border bg-green-500/5 p-3 text-sm text-muted-foreground">
          <BadgePercent className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
          <span>
            <span className="font-semibold text-foreground">Affiliate referral {activeRef} is active</span> — discounted
            prices are shown below.
          </span>
        </div>
      ) : null}

      {error && !data ? (
        <EmptyState
          icon={Crown}
          title="Could not load plans"
          hint="We couldn't reach the plans service. Check your connection and try again."
          action={
            <Button size="sm" onClick={retry}>
              Try again
            </Button>
          }
        />
      ) : loading && !data ? (
        <div className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-3 md:gap-6" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5 sm:p-6">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="my-5 h-px w-full" />
              <div className="space-y-3">
                {[0, 1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="mt-6 h-9 w-28" />
              <Skeleton className="mt-5 h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (data?.plans ?? []).length === 0 ? (
        <EmptyState icon={Crown} title="No plans available" hint="The platform hasn't published any plans yet — check back soon." />
      ) : (
        <div className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-3 md:gap-6">
          {(data?.plans ?? []).map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              current={currentTier === plan.tier}
              canBuy={canBuy}
              refActive={refActive}
              fmt={fmt}
              onBuy={() => setBuying(plan)}
            />
          ))}
        </div>
      )}

      {buying ? (
        <PurchaseDialog
          key={buying.tier}
          plan={buying}
          refCode={activeRef ?? undefined}
          onOpenChange={(o) => {
            if (!o) setBuying(null)
          }}
          onPurchased={(t) => setJustBought(t)}
        />
      ) : null}
    </section>
  )
}
