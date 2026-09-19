'use client'

// Referral invite page (Task 19-b) — fixes the old /login?ref=… 404.
// Rendered for logged-out visitors who open /?ref=CODE: shows who invited them,
// the Rs 500 off Basic Plan deal, the plan catalog and sign-up CTAs.

import { useCallback, useEffect, useState } from 'react'
import { BadgePercent, Coins, Info, Link2Off, Search, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { request } from '@/lib/api'
import type { PlanDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useMoney } from '@/store/useCurrencyStore'
import { EmptyState } from '../shared/EmptyState'
import { UserAvatar } from '../shared/UserAvatar'
import { Footer } from '../layout/Footer'

interface ReferralLandingProps {
  code: string
  onLogin: () => void
  onSignup: () => void
}

interface RefResponse {
  valid: boolean
  referrer?: { name: string; avatar: string | null }
  plans?: PlanDTO[]
}

type Stage = 'loading' | 'invalid' | 'error' | 'ready'

const TIER_ORDER: PlanDTO['tier'][] = ['BASIC', 'PRO', 'ACADEMY']

const STEPS = [
  'Sign up through this link.',
  'Buy a plan at the discounted price.',
  'Coins land in your wallet instantly.',
]

/** Small sticky top bar for public pages (duplicated on LandingView by design). */
function PublicTopBar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <span className="shrink-0 font-logo text-[22px] tracking-tight text-[#1877F2]" aria-label="StudySir home">
          StudySir
        </span>
        {/* Decorative search — does nothing until you sign up (kept out of the a11y tree) */}
        <div className="hidden w-full max-w-xs justify-center md:flex" aria-hidden="true">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              tabIndex={-1}
              placeholder="Search Tuition"
              className="h-10 w-full rounded-full bg-muted pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <Button className="rounded-full bg-[#1877F2] px-5 hover:bg-[#166fe5]" onClick={onLogin}>
            Log in
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-[#1877F2] px-5 text-[#1877F2] hover:bg-blue-500/5"
            onClick={onSignup}
          >
            Sign up
          </Button>
        </div>
      </div>
    </header>
  )
}

function ReferralPlanCard({
  plan,
  fmt,
  onSignup,
}: {
  plan: PlanDTO
  fmt: (pkr: number) => string
  onSignup: () => void
}) {
  // Only the Basic tier is discounted through a referral link (Rs 2,500 instead of Rs 3,000).
  const deal = plan.tier === 'BASIC' && plan.affiliatePrice < plan.price
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-card p-4',
        plan.popular && 'border-[#1877F2] ring-1 ring-[#1877F2]'
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1877F2] px-3 py-1 text-xs font-bold text-white shadow-sm">
          Most Popular
        </span>
      ) : null}

      <h3 className="text-lg font-extrabold tracking-tight">{plan.name}</h3>

      <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
        <span className="text-2xl font-extrabold">{fmt(deal ? plan.affiliatePrice : plan.price)}</span>
        {deal ? <span className="text-sm text-muted-foreground line-through">{fmt(plan.price)}</span> : null}
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Coins className="size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
        +{plan.coins.toLocaleString()} coins
      </p>

      <div className="mt-auto pt-4">
        <Button
          variant={plan.popular ? 'default' : 'outline'}
          className={cn('w-full', plan.popular && 'bg-[#1877F2] text-white hover:bg-[#166fe5]')}
          onClick={onSignup}
        >
          Get {plan.name}
        </Button>
      </div>
    </div>
  )
}

export function ReferralLanding({ code, onLogin, onSignup }: ReferralLandingProps) {
  const { fmt } = useMoney(null)

  const [stage, setStage] = useState<Stage>('loading')
  const [referrer, setReferrer] = useState<{ name: string; avatar: string | null } | null>(null)
  const [plans, setPlans] = useState<PlanDTO[]>([])

  const load = useCallback(async () => {
    try {
      const d = await request<RefResponse>('/api/ref/' + encodeURIComponent(code))
      if (!d.valid || !d.referrer) {
        setStage('invalid')
        return
      }
      setReferrer(d.referrer)
      setPlans([...(d.plans ?? [])].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)))
      setStage('ready')
    } catch {
      setStage('error')
    }
  }, [code])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  function retry() {
    setStage('loading')
    void load()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicTopBar onLogin={onLogin} onSignup={onSignup} />

      <main className="flex-1">
        {stage === 'loading' ? (
          <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8" aria-hidden="true">
            <Skeleton className="h-48 rounded-xl" />
            <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-3">
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        ) : null}

        {stage === 'invalid' ? (
          <div className="mx-auto w-full max-w-3xl px-4 py-10">
            <EmptyState
              icon={Link2Off}
              title="This invite link is not valid"
              hint="The invite code may have expired or was mistyped — ask your friend to share their referral link again from the Affiliate Program page."
              action={
                <Button className="rounded-full bg-[#1877F2] hover:bg-[#166fe5]" onClick={onLogin}>
                  Go to StudySir
                </Button>
              }
            />
          </div>
        ) : null}

        {stage === 'error' ? (
          <div className="mx-auto w-full max-w-3xl px-4 py-10">
            <EmptyState
              icon={WifiOff}
              title="Couldn't load this invite"
              hint="We couldn't reach StudySir. Check your connection and try again."
              action={
                <Button size="sm" onClick={retry}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : null}

        {stage === 'ready' && referrer ? (
          <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
            {/* Invite hero */}
            <section
              aria-label={`${referrer.name} invited you to StudySir`}
              className="card-shadow flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center"
            >
              <UserAvatar src={referrer.avatar} name={referrer.name} className="size-16" />
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {referrer.name} invited you to StudySir
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Join through this link and get Rs 500 off the Basic Plan — Rs 2,500 instead of Rs 3,000.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400">
                <BadgePercent className="size-3.5 shrink-0" aria-hidden="true" />
                Rs 500 OFF Basic Plan
              </span>
            </section>

            {/* Plans */}
            <section aria-label="Premium plans" className="space-y-2">
              <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-3">
                {plans.map((plan) => (
                  <ReferralPlanCard key={plan.tier} plan={plan} fmt={fmt} onSignup={onSignup} />
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">Plans are for teachers — students join free.</p>
            </section>

            {/* How it works */}
            <section aria-label="How it works" className="rounded-xl border bg-card p-5">
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <Info className="size-4 shrink-0 text-[#1877F2]" aria-hidden="true" />
                How it works
              </h2>
              <ol className="mt-3 space-y-3">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#1877F2] text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Bottom CTA */}
            <div className="space-y-2 pb-2">
              <Button
                className="h-11 w-full rounded-full bg-[#1877F2] text-base font-bold hover:bg-[#166fe5]"
                onClick={onSignup}
              >
                Claim Rs 500 off &amp; Sign up
              </Button>
              <Button variant="ghost" className="w-full rounded-full" onClick={onLogin}>
                I already have an account
              </Button>
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}
