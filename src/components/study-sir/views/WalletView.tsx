'use client'

// Unified wallet (requirement: ONE wallet with everything):
//  - MONEY tab  — balance, Add Money (bank transfer + screenshot), Withdraw
//                 (min PKR 1,000), top-up/withdrawal statuses and money history.
//  - COINS tab  — balance + full coin history (how many, when, from which plan,
//                 what was spent). Coins are NEVER bought here — they come only
//                 with a Premium Plan, so the tab links to the plans page.
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  Banknote,
  Clock3,
  Coins,
  Crown,
  Gift,
  Handshake,
  Landmark,
  MessageSquare,
  PartyPopper,
  ShoppingBag,
  ShieldCheck,
  Undo2,
  UsersRound,
  Wallet as WalletIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { CoinTransactionDTO, TopUpDTO, WalletPlanPurchaseDTO, WalletResponse, WithdrawalDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { planByTier } from '@/lib/plans'
import { PaymentDialog } from '../dialogs/PaymentDialog'
import { WithdrawDialog } from '../dialogs/WithdrawDialog'
import { FbCard } from '../shared/bits'
import { clockTime, fullDate, timeAgo } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'

const TX_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  SPEND_CONTACT: { icon: MessageSquare, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  REFUND_AUTO: { icon: Undo2, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  REFUND_REJECT: { icon: Undo2, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  PLAN_COINS: { icon: Crown, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  PLAN_CLAWBACK: { icon: Undo2, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  TOPUP_VERIFIED: { icon: ShieldCheck, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  TOPUP_REVERSED: { icon: Undo2, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  MILESTONE_BONUS: { icon: PartyPopper, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  MONEY_ADD: { icon: Banknote, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  AFFILIATE_EARNING: { icon: UsersRound, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  WITHDRAW_HOLD: { icon: ArrowUpFromLine, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  WITHDRAW_PAID: { icon: Landmark, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  WITHDRAW_REFUND: { icon: ArrowDownToLine, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  GOOD_SALE: { icon: ShoppingBag, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  GOOD_PURCHASE: { icon: ShoppingBag, className: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400' },
  WELCOME: { icon: Gift, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  HIRE_BONUS: { icon: Handshake, className: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400' },
  MONETIZE: { icon: BadgeDollarSign, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
}

/** Transaction types that move MONEY (PKR) instead of coins. */
const MONEY_TYPES = new Set([
  'MONEY_ADD',
  'AFFILIATE_EARNING',
  'GOOD_SALE',
  'GOOD_PURCHASE',
  'WITHDRAW_HOLD',
  'WITHDRAW_PAID',
  'WITHDRAW_REFUND',
])

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  ACTIVE: 'bg-green-500/15 text-green-700 dark:text-green-300',
  APPROVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

function TransactionRow({ tx }: { tx: CoinTransactionDTO }) {
  const style = TX_STYLE[tx.type] ?? { icon: Coins, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' }
  const Icon = style.icon
  const positive = tx.amount > 0
  const neutral = tx.amount === 0
  const isMoney = MONEY_TYPES.has(tx.type)
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', style.className)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description ?? tx.type}</p>
        <p className="text-xs text-muted-foreground">
          {fullDate(tx.createdAt)} · {clockTime(tx.createdAt)}
        </p>
      </div>
      {!neutral ? (
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-sm font-bold',
            positive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {positive ? '+' : '−'}
          {isMoney ? (
            <span>PKR {Math.abs(tx.amount).toLocaleString()}</span>
          ) : (
            <>
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              {Math.abs(tx.amount)}
            </>
          )}
        </span>
      ) : null}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', STATUS_BADGE[status] ?? 'bg-muted text-muted-foreground')}>
      {status}
    </span>
  )
}

function PlanPurchaseRow({ p }: { p: WalletPlanPurchaseDTO }) {
  const name = planByTier(p.tier)?.name ?? `${p.tier} Plan`
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-sm">
      <Crown className="size-4 shrink-0 text-[#1877F2]" />
      <span className="font-semibold">{name}</span>
      <span className="truncate text-muted-foreground">
        · PKR {p.price.toLocaleString()} → {p.coinsGranted.toLocaleString()} coins
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        <StatusPill status={p.status} />
        <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
      </span>
    </div>
  )
}

export function WalletView() {
  const params = useAppStore((s) => s.params)
  const nonce = useAppStore((s) => s.nonce)
  const me = useAppStore((s) => s.me)!
  const refreshMe = useAppStore((s) => s.refreshMe)
  const go = useAppStore((s) => s.go)
  const replace = useAppStore((s) => s.replace)
  const { fmt } = useMoney(me)

  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [topupOpen, setTopupOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const isTeacher = me.role === 'TEACHER'

  const load = useCallback(async () => {
    try {
      const d = await api.getWallet()
      setWallet(d)
    } catch {
      setWallet(null)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load, nonce])

  const money = wallet?.money ?? me.money
  const coins = wallet?.coins ?? me.coins
  const transactions = wallet?.transactions ?? []
  const planPurchases = wallet?.planPurchases ?? []
  const moneyTopups = (wallet?.topups ?? []).filter((t) => t.kind === 'STUDENT_MONEY')
  const pendingMoneyTopups = moneyTopups.filter((t) => t.status === 'PENDING')
  const pendingWithdrawals = (wallet?.withdrawals ?? []).filter((w) => w.status === 'PENDING')
  const pendingPlans = planPurchases.filter((p) => p.status === 'PENDING')

  // Unified wallet: exactly two tabs — Money and Coins.
  const tab = params.tab === 'coins' ? 'coins' : 'money'

  const moneyTransactions = transactions.filter((tx) => MONEY_TYPES.has(tx.type))
  const coinTransactions = transactions.filter((tx) => !MONEY_TYPES.has(tx.type))

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white shadow-md">
          <div className="flex items-start justify-between">
            <Banknote className="h-8 w-8" />
            <div className="flex gap-1.5">
              <Button size="sm" className="bg-white/20 text-white hover:bg-white/30" onClick={() => setTopupOpen(true)}>
                Add Money
              </Button>
              <Button size="sm" className="bg-white/20 text-white hover:bg-white/30" onClick={() => setWithdrawOpen(true)}>
                Withdraw
              </Button>
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold">{fmt(money)}</p>
          <p className="mt-1 text-sm opacity-90">Money wallet — goods, courses &amp; withdrawals</p>
          {pendingWithdrawals.length > 0 || pendingMoneyTopups.length > 0 ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-white/90">
              <Clock3 className="size-3" />
              {pendingWithdrawals.length} withdrawal(s) · {pendingMoneyTopups.length} top-up(s) awaiting review
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-md">
          <div className="flex items-start justify-between">
            <Coins className="h-8 w-8" />
            {isTeacher ? (
              <Button size="sm" className="bg-white/20 text-white hover:bg-white/30" onClick={() => go('plans')}>
                <Crown className="mr-1 size-3.5" />
                Get Coins
              </Button>
            ) : null}
          </div>
          <p className="mt-3 text-3xl font-bold">{coins.toLocaleString()}</p>
          <p className="mt-1 text-sm opacity-90">
            {isTeacher ? 'Coins — spent when you accept student requests' : 'Coins are used by teachers — you never need them'}
          </p>
          {pendingPlans.length > 0 ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-white/90">
              <Clock3 className="size-3" />
              {pendingPlans.length} plan payment(s) under verification
            </p>
          ) : null}
        </div>
      </div>

      {!isTeacher ? (
        <div className="flex items-start gap-2 rounded-xl border bg-blue-500/5 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1877F2]" />
          <span>
            <span className="font-semibold text-foreground">Students &amp; parents never need coins.</span> Posting
            tuition and hiring teachers is always free — you only pay for digital goods from your money wallet.
          </span>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => replace('wallet', { tab: v })} className="gap-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="money" className="gap-1.5">
            <Banknote className="size-4" /> Money
          </TabsTrigger>
          <TabsTrigger value="coins" className="gap-1.5">
            <Coins className="size-4" /> Coins
          </TabsTrigger>
        </TabsList>

        {/* ============================== MONEY ============================== */}
        <TabsContent value="money" className="space-y-4">
          <FbCard className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-green-500/15">
                <Banknote className="size-5 text-green-600 dark:text-green-400" />
              </span>
              <div>
                <p className="font-bold">Money Wallet</p>
                <p className="text-sm text-muted-foreground">Buy digital goods · withdraw earnings any time.</p>
              </div>
              <p className="ml-auto text-2xl font-bold text-green-600">{fmt(money)}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setTopupOpen(true)}>
                <ArrowDownToLine className="mr-1.5 size-4" /> Add Money
              </Button>
              <Button size="sm" variant="outline" onClick={() => setWithdrawOpen(true)}>
                <ArrowUpFromLine className="mr-1.5 size-4" /> Withdraw
              </Button>
            </div>
            <p className="mt-3 rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
              Top-ups go through a platform bank account — pay, upload the screenshot, and the money lands after
              verification. Sellers receive digital-product payments minus the platform commission.
            </p>
          </FbCard>

          {moneyTopups.length > 0 ? (
            <FbCard className="p-4">
              <p className="pb-2 font-bold">My top-ups</p>
              <div className="space-y-2">
                {moneyTopups.map((t: TopUpDTO) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-sm">
                    <Banknote className="size-4 text-green-600" />
                    <span className="font-semibold">PKR {t.amount.toLocaleString()}</span>
                    <span className="truncate text-muted-foreground">· {t.method}</span>
                    {t.adminNote ? <span className="hidden truncate text-xs text-muted-foreground sm:inline">“{t.adminNote}”</span> : null}
                    <span className="ml-auto flex items-center gap-1.5">
                      <StatusPill status={t.status} />
                      <span className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </FbCard>
          ) : null}

          <FbCard className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <p className="flex items-center gap-2 font-bold">
                <ArrowUpFromLine className="size-4 text-green-600" /> Withdrawals
              </p>
              <Button size="sm" variant="outline" onClick={() => setWithdrawOpen(true)} disabled={money < 1000}>
                New withdrawal
              </Button>
            </div>
            {(wallet?.withdrawals ?? []).length === 0 ? (
              <div className="py-4">
                <EmptyState
                  icon={Landmark}
                  title="No withdrawals yet"
                  hint="Requests need at least PKR 1,000 and are paid manually after review."
                />
              </div>
            ) : (
              <div className="space-y-2">
                {(wallet?.withdrawals ?? []).map((w: WithdrawalDTO) => (
                  <div key={w.id} className="rounded-lg bg-muted/60 p-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <ArrowUpFromLine className="size-4 shrink-0 text-green-600" />
                      <span className="font-semibold">PKR {w.amount.toLocaleString()}</span>
                      <span className="truncate text-muted-foreground">→ {w.bankName}</span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <StatusPill status={w.status} />
                        <span className="text-xs text-muted-foreground">{timeAgo(w.createdAt)}</span>
                      </span>
                    </div>
                    <p className="mt-0.5 truncate pl-6 text-xs text-muted-foreground">
                      {w.accountTitle} · <span className="font-mono">{w.accountNumber}</span>
                      {w.adminNote ? ` · “${w.adminNote}”` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {wallet?.bankDetails?.bankName ? (
              <p className="mt-3 flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
                <Landmark className="size-4 shrink-0" />
                Saved payout account: <b>{wallet.bankDetails.bankName}</b> · {wallet.bankDetails.accountTitle} ·{' '}
                <span className="font-mono">{wallet.bankDetails.accountNumber}</span>
              </p>
            ) : null}
          </FbCard>

          <FbCard className="p-4">
            <p className="pb-2 font-bold">Money history</p>
            <div className="max-h-96 divide-y overflow-y-auto [scrollbar-width:thin]">
              {moneyTransactions.length === 0 ? (
                <div className="py-6">
                  <EmptyState
                    icon={WalletIcon}
                    title="No money movements yet"
                    hint="Top-ups, sales, purchases and withdrawals will show up here."
                  />
                </div>
              ) : (
                moneyTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              )}
            </div>
          </FbCard>
        </TabsContent>

        {/* ============================== COINS ============================== */}
        <TabsContent value="coins" className="space-y-4">
          {isTeacher ? (
            <FbCard className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-amber-500/15">
                  <Crown className="size-5 text-amber-500" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold">Coins come only with a Premium Plan</p>
                  <p className="text-sm text-muted-foreground">
                    Basic → 3,000 · Pro → 6,000 · Academy → 12,000 coins. Coins are credited the moment your payment
                    proof is submitted.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="bg-[#1877F2] hover:bg-[#166fe5]" onClick={() => go('plans')}>
                  <Crown className="mr-1.5 size-4" /> View Premium Plans
                </Button>
              </div>
              <p className="mt-3 rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
                There is no separate “buy coins” option — a plan IS the way to get coins, and it also makes you a paid
                teacher.
              </p>
            </FbCard>
          ) : null}

          {planPurchases.length > 0 ? (
            <FbCard className="p-4">
              <p className="pb-2 font-bold">My plan purchases</p>
              <div className="space-y-2">
                {planPurchases.map((p) => (
                  <PlanPurchaseRow key={p.id} p={p} />
                ))}
              </div>
            </FbCard>
          ) : null}

          <FbCard className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <p className="font-bold">Coins history</p>
              <p className="text-xs text-muted-foreground">
                {coins.toLocaleString()} coins available
              </p>
            </div>
            <div className="max-h-96 divide-y overflow-y-auto [scrollbar-width:thin]">
              {coinTransactions.length === 0 ? (
                <div className="py-6">
                  <EmptyState
                    icon={Coins}
                    title="No coin activity yet"
                    hint="Every coin you get from a plan — and every coin you spend — is logged here."
                  />
                </div>
              ) : (
                coinTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              )}
            </div>
          </FbCard>
        </TabsContent>
      </Tabs>

      <PaymentDialog open={topupOpen} onOpenChange={setTopupOpen} onDone={() => void load()} />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        balance={money}
        bankDetails={wallet?.bankDetails ?? { bankName: null, accountTitle: null, accountNumber: null }}
        onDone={() => void load()}
      />
    </div>
  )
}
