'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  Banknote,
  Clock3,
  Coins,
  Gift,
  Handshake,
  Landmark,
  MessageSquare,
  PartyPopper,
  ShoppingBag,
  ShieldCheck,
  Undo2,
  Wallet as WalletIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { COIN_PACKAGES } from '@/lib/coins'
import type { CoinTransactionDTO, TopUpDTO, WalletResponse, WithdrawalDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { PaymentDialog } from '../dialogs/PaymentDialog'
import { WithdrawDialog } from '../dialogs/WithdrawDialog'
import { FbCard } from '../shared/bits'
import { clockTime, fullDate, timeAgo } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'

const TX_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  SPEND_CONTACT: { icon: MessageSquare, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  REFUND_AUTO: { icon: Undo2, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  REFUND_REJECT: { icon: Undo2, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  PURCHASE: { icon: Coins, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  TOPUP_VERIFIED: { icon: ShieldCheck, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  TOPUP_REVERSED: { icon: Undo2, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  MILESTONE_BONUS: { icon: PartyPopper, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  MONEY_ADD: { icon: Banknote, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  WITHDRAW_HOLD: { icon: ArrowUpFromLine, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  WITHDRAW_PAID: { icon: Landmark, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  WITHDRAW_REFUND: { icon: ArrowDownToLine, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  GOOD_SALE: { icon: ShoppingBag, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  GOOD_PURCHASE: { icon: ShoppingBag, className: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400' },
  WELCOME: { icon: Gift, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  HIRE_BONUS: { icon: Handshake, className: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400' },
  MONETIZE: { icon: BadgeDollarSign, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  APPROVED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

function TransactionRow({ tx }: { tx: CoinTransactionDTO }) {
  const style = TX_STYLE[tx.type] ?? { icon: Coins, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' }
  const Icon = style.icon
  const positive = tx.amount > 0
  const neutral = tx.amount === 0
  const isMoney = ['MONEY_ADD', 'GOOD_SALE', 'GOOD_PURCHASE', 'WITHDRAW_HOLD', 'WITHDRAW_PAID', 'WITHDRAW_REFUND'].includes(tx.type)
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
          {positive ? '+' : ''}
          {isMoney ? (
            <span>{tx.type === 'GOOD_PURCHASE' ? `−PKR ${Math.abs(tx.amount)}` : `PKR ${Math.abs(tx.amount)}`}</span>
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

export function WalletView() {
  const params = useAppStore((s) => s.params)
  const nonce = useAppStore((s) => s.nonce)
  const me = useAppStore((s) => s.me)!
  const refreshMe = useAppStore((s) => s.refreshMe)
  const replace = useAppStore((s) => s.replace)
  const { fmt } = useMoney(me)

  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [topupOpen, setTopupOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [txFilter, setTxFilter] = useState<'all' | 'spent' | 'refunds' | 'earned'>('all')

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
  const pendingTopups = (wallet?.topups ?? []).filter((t) => t.status === 'PENDING')
  const pendingWithdrawals = (wallet?.withdrawals ?? []).filter((w) => w.status === 'PENDING')

  // 'coins' | 'money' | 'history' | 'withdraw'
  const rawTab = params.tab ?? (isTeacher ? 'coins' : 'money')
  const VALID = isTeacher ? ['coins', 'money', 'history', 'withdraw'] : ['money', 'history', 'withdraw']
  const tab = VALID.includes(rawTab) ? rawTab : 'money'

  const REFUND_TYPES = new Set(['REFUND_AUTO', 'REFUND_REJECT', 'WITHDRAW_REFUND', 'TOPUP_REVERSED'])
  const SPEND_TYPES = new Set(['SPEND_CONTACT', 'GOOD_PURCHASE', 'TOPUP_REVERSED'])
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'all') return true
    if (txFilter === 'refunds') return REFUND_TYPES.has(tx.type)
    if (txFilter === 'spent') return SPEND_TYPES.has(tx.type) || tx.amount < 0
    return !SPEND_TYPES.has(tx.type) && (tx.amount > 0 || tx.type === 'MONEY_ADD' || tx.type === 'GOOD_SALE')
  })

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* Balance cards */}
      <div className={isTeacher ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
        {isTeacher ? (
          <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-md">
            <div className="flex items-start justify-between">
              <Coins className="h-8 w-8" />
              <Button
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30"
                onClick={() => setTopupOpen(true)}
              >
                Buy Coins
              </Button>
            </div>
            <p className="mt-3 text-3xl font-bold">{coins}</p>
            <p className="mt-1 text-sm opacity-90">Coins — spent when you accept student requests</p>
            {pendingTopups.filter((t) => t.kind === 'TEACHER_COINS').length > 0 ? (
              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-white/90">
                <Clock3 className="size-3" />
                {pendingTopups.filter((t) => t.kind === 'TEACHER_COINS').length} payment proof(s) under verification
              </p>
            ) : null}
          </div>
        ) : null}

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
          <p className="mt-1 text-sm opacity-90">Money wallet — goods purchases &amp; withdrawals</p>
          {pendingWithdrawals.length > 0 || pendingTopups.filter((t) => t.kind === 'STUDENT_MONEY').length > 0 ? (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-white/90">
              <Clock3 className="size-3" />
              {pendingWithdrawals.length} withdrawal(s) ·{' '}
              {pendingTopups.filter((t) => t.kind === 'STUDENT_MONEY').length} top-up(s) awaiting review
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
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-4">
          {isTeacher ? <TabsTrigger value="coins">Buy Coins</TabsTrigger> : null}
          <TabsTrigger value="money">Money</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {isTeacher ? (
          <TabsContent value="coins" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COIN_PACKAGES.map((pkg) => (
                <div key={pkg.id} className="card-shadow rounded-xl border bg-card p-4 text-center">
                  <Coins className="mx-auto size-6 text-amber-500" />
                  <p className="mt-2 text-2xl font-bold">{pkg.coins}</p>
                  <p className="text-sm text-muted-foreground">{pkg.label}</p>
                  <p className="mt-0.5 font-semibold">{fmt(pkg.price)}</p>
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    onClick={() => setTopupOpen(true)}
                  >
                    Buy
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Coins are spent when you accept tuition posts and student requests. Payment is by bank transfer + screenshot —
              coins are added instantly, then confirmed by the platform.
            </p>
            {pendingTopups.filter((t) => t.kind === 'TEACHER_COINS').length > 0 ? (
              <FbCard className="p-4">
                <p className="pb-2 font-bold">Payment proofs under verification</p>
                <div className="space-y-2">
                  {(wallet?.topups ?? [])
                    .filter((t) => t.kind === 'TEACHER_COINS')
                    .map((t: TopUpDTO) => (
                      <div key={t.id} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-sm">
                        <Coins className="size-4 text-amber-500" />
                        <span className="font-semibold">{t.coinsGranted} coins</span>
                        <span className="text-muted-foreground">· PKR {t.amount.toLocaleString()} · {t.method}</span>
                        <span className="ml-auto flex items-center gap-1.5">
                          <StatusPill status={t.status} />
                          <span className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</span>
                        </span>
                      </div>
                    ))}
                </div>
              </FbCard>
            ) : null}
          </TabsContent>
        ) : null}

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

          {pendingTopups.filter((t) => t.kind === 'STUDENT_MONEY').length > 0 || (wallet?.topups ?? []).some((t) => t.kind === 'STUDENT_MONEY') ? (
            <FbCard className="p-4">
              <p className="pb-2 font-bold">My top-ups</p>
              <div className="space-y-2">
                {(wallet?.topups ?? [])
                  .filter((t) => t.kind === 'STUDENT_MONEY')
                  .map((t: TopUpDTO) => (
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
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-4">
          <FbCard className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-green-500/15">
                <Landmark className="size-5 text-green-600 dark:text-green-400" />
              </span>
              <div className="min-w-0">
                <p className="font-bold">Withdraw to your bank</p>
                <p className="text-sm text-muted-foreground">
                  Minimum PKR 1,000 · delivered manually after review · account details required.
                </p>
              </div>
              <Button className="ml-auto bg-green-600 hover:bg-green-700" onClick={() => setWithdrawOpen(true)} disabled={money < 1000}>
                <ArrowUpFromLine className="mr-1.5 size-4" /> New withdrawal
              </Button>
            </div>
            {money < 1000 ? (
              <p className="mt-3 rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
                You need at least PKR 1,000 to request a withdrawal — current balance {fmt(money)}.
              </p>
            ) : null}
            {wallet?.bankDetails?.bankName ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Landmark className="size-4 shrink-0" />
                Saved: <b>{wallet.bankDetails.bankName}</b> · {wallet.bankDetails.accountTitle} ·{' '}
                <span className="font-mono">{wallet.bankDetails.accountNumber}</span>
              </p>
            ) : null}
          </FbCard>

          <FbCard className="p-4">
            <p className="pb-2 font-bold">Withdrawal requests</p>
            {(wallet?.withdrawals ?? []).length === 0 ? (
              <div className="py-6">
                <EmptyState icon={Landmark} title="No withdrawals yet" hint="Your withdrawal requests and their status will appear here." />
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
          </FbCard>
        </TabsContent>

        <TabsContent value="history">
          <FbCard className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <p className="font-bold">All Transactions</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter transactions">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'spent', label: 'Spent' },
                    { key: 'refunds', label: 'Refunds' },
                    { key: 'earned', label: 'Earned' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={txFilter === f.key}
                    onClick={() => setTxFilter(f.key)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      txFilter === f.key
                        ? 'border-[#1877F2] bg-blue-500/10 text-[#1877F2] dark:text-blue-400'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-96 divide-y overflow-y-auto">
              {filteredTransactions.length === 0 ? (
                <div className="py-6">
                  <EmptyState
                    icon={WalletIcon}
                    title={transactions.length === 0 ? 'No transactions yet' : 'Nothing in this filter'}
                    hint="Coins, payments, sales and refunds will show up here."
                  />
                </div>
              ) : (
                filteredTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              )}
            </div>
          </FbCard>
        </TabsContent>
      </Tabs>

      {!isTeacher && tab === 'money' ? (
        <Badge variant="outline" className="sr-only">
          money wallet
        </Badge>
      ) : null}

      <PaymentDialog open={topupOpen} onOpenChange={setTopupOpen} kind={isTeacher ? 'TEACHER_COINS' : 'STUDENT_MONEY'} onDone={() => void load()} />
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
