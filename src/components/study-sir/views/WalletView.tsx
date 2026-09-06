'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BadgeDollarSign,
  Banknote,
  Coins,
  Gift,
  Handshake,
  MessageSquare,
  ShoppingBag,
  ShieldCheck,
  Undo2,
  Wallet as WalletIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, errorMessage } from '@/lib/api'
import type { CoinTransactionDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { FbCard } from '../shared/bits'
import { clockTime, fullDate } from '../shared/format'
import { EmptyState } from '../shared/EmptyState'

/** Client mirror of server COIN_PACKAGES (src/lib/coins.ts imports prisma — keep in sync). */
const COIN_PACKAGES = [
  { id: 'pack_100', coins: 100, price: 1, label: 'Starter' },
  { id: 'pack_500', coins: 500, price: 4.5, label: 'Value' },
  { id: 'pack_1000', coins: 1000, price: 8, label: 'Pro' },
  { id: 'pack_5000', coins: 5000, price: 35, label: 'Academy' },
]

const QUICK_AMOUNTS = [5, 10, 25, 50]

const TX_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  SPEND_CONTACT: { icon: MessageSquare, className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  REFUND_AUTO: { icon: Undo2, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  REFUND_REJECT: { icon: Undo2, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  PURCHASE: { icon: ShoppingBag, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  GOOD_PURCHASE: { icon: ShoppingBag, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  WELCOME: { icon: Gift, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  HIRE_BONUS: { icon: Handshake, className: 'bg-blue-500/15 text-[#1877F2] dark:text-blue-400' },
  MONETIZE: { icon: BadgeDollarSign, className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  ADD_MONEY: { icon: Banknote, className: 'bg-green-500/15 text-green-600 dark:text-green-400' },
}

function TransactionRow({ tx }: { tx: CoinTransactionDTO }) {
  const style = TX_STYLE[tx.type] ?? { icon: Coins, className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' }
  const Icon = style.icon
  const positive = tx.amount >= 0
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
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 text-sm font-bold',
          positive ? 'text-green-600' : 'text-red-600'
        )}
      >
        {positive ? '+' : ''}
        <span className="flex items-center gap-1">
          <Coins className="h-3.5 w-3.5 text-amber-500" />
          {tx.amount}
        </span>
      </span>
    </div>
  )
}

export function WalletView() {
  const params = useAppStore((s) => s.params)
  const nonce = useAppStore((s) => s.nonce)
  const me = useAppStore((s) => s.me)!
  const refreshMe = useAppStore((s) => s.refreshMe)
  const replace = useAppStore((s) => s.replace)

  const [coins, setCoins] = useState<number | null>(null)
  const [money, setMoney] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<CoinTransactionDTO[]>([])
  const [buying, setBuying] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [txFilter, setTxFilter] = useState<'all' | 'spent' | 'refunds' | 'earned'>('all')

  const load = useCallback(async () => {
    try {
      const d = await api.getWallet()
      setCoins(d.coins)
      setMoney(d.money)
      setTransactions(d.transactions)
    } catch {
      setCoins(0)
      setMoney(0)
      setTransactions([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, nonce])

  // 'coins' | 'buy' -> packages grid; 'history'; 'money'
  // Students/parents have NO coins — their wallet is money-only (buy-coins is teacher-only).
  const isTeacher = me.role === 'TEACHER'
  const rawTab = params.tab ?? (isTeacher ? 'coins' : 'money')
  const tab = !isTeacher && rawTab !== 'history' && rawTab !== 'money' ? 'money' : rawTab === 'history' ? 'history' : rawTab === 'money' ? 'money' : 'coins'

  const REFUND_TYPES = new Set(['REFUND_AUTO', 'REFUND_REJECT'])
  const SPEND_TYPES = new Set(['SPEND_CONTACT', 'GOOD_PURCHASE'])
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'all') return true
    if (txFilter === 'refunds') return REFUND_TYPES.has(tx.type)
    if (txFilter === 'spent') return SPEND_TYPES.has(tx.type) || tx.amount < 0
    return !SPEND_TYPES.has(tx.type) && tx.amount > 0 && !REFUND_TYPES.has(tx.type)
  })

  async function buyPackage(packageId: string, packageCoins: number) {
    setBuying(packageId)
    try {
      await api.buyCoins(packageId)
      toast.success(`+${packageCoins} coins!`, { description: 'Your new balance is ready to use.' })
      await load()
      await refreshMe()
    } catch (e) {
      toast.error('Purchase failed', { description: errorMessage(e) })
    } finally {
      setBuying(null)
    }
  }

  async function addMoney() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || adding) return
    setAdding(true)
    try {
      const d = await api.addMoney(value)
      toast.success(`Rs ${value} added to your wallet`)
      setMoney(d.money)
      setAddOpen(false)
      setAmount('')
      await load()
      await refreshMe()
    } catch (e) {
      toast.error('Could not add money', { description: errorMessage(e) })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {/* Balance cards — students/parents see money only; teachers also see coins */}
      <div className={isTeacher ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
        {isTeacher ? (
          <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-md">
            <div className="flex items-start justify-between">
              <Coins className="h-8 w-8" />
              <Button
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30"
                onClick={() => replace('wallet', { tab: 'coins' })}
              >
                Buy Coins
              </Button>
            </div>
            <p className="mt-3 text-3xl font-bold">{coins ?? '—'}</p>
            <p className="mt-1 text-sm opacity-90">Coins — spent when you accept student requests</p>
          </div>
        ) : null}

        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-white shadow-md">
          <div className="flex items-start justify-between">
            <Banknote className="h-8 w-8" />
            <Button size="sm" className="bg-white/20 text-white hover:bg-white/30" onClick={() => setAddOpen(true)}>
              Add Money
            </Button>
          </div>
          <p className="mt-3 text-3xl font-bold">{money === null ? '—' : `Rs ${money}`}</p>
          <p className="mt-1 text-sm opacity-90">For digital goods purchases</p>
        </div>
      </div>

      {!isTeacher ? (
        <div className="flex items-start gap-2 rounded-xl border bg-blue-500/5 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#1877F2]" />
          <span>
            <span className="font-semibold text-foreground">Students &amp; parents never need coins.</span> Posting
            tuition and contacting teachers is always free — you only pay for digital goods from your money wallet.
          </span>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => replace('wallet', { tab: v })} className="gap-4">
        <TabsList className={isTeacher ? 'grid w-full grid-cols-3 sm:w-96' : 'grid w-full grid-cols-2 sm:w-64'}>
          {isTeacher ? <TabsTrigger value="coins">Buy Coins</TabsTrigger> : null}
          <TabsTrigger value="history">Wallet History</TabsTrigger>
          <TabsTrigger value="money">Money</TabsTrigger>
        </TabsList>

        {isTeacher ? (
          <TabsContent value="coins">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COIN_PACKAGES.map((pkg) => (
                <div key={pkg.id} className="card-shadow rounded-xl border bg-card p-4 text-center">
                  <Coins className="mx-auto size-6 text-amber-500" />
                  <p className="mt-2 text-2xl font-bold">{pkg.coins}</p>
                  <p className="text-sm text-muted-foreground">{pkg.label}</p>
                  <p className="mt-0.5 font-semibold">${pkg.price}</p>
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    disabled={buying !== null}
                    onClick={() => buyPackage(pkg.id, pkg.coins)}
                  >
                    {buying === pkg.id ? 'Buying…' : 'Buy'}
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Coins are spent when you accept tuition posts and student requests.
            </p>
          </TabsContent>
        ) : null}

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
                    hint="Coin purchases, spends and refunds will show up here."
                  />
                </div>
              ) : (
                filteredTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
              )}
            </div>
          </FbCard>
        </TabsContent>

        <TabsContent value="money">
          <FbCard className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-green-500/15">
                <Banknote className="size-5 text-green-600 dark:text-green-400" />
              </span>
              <div>
                <p className="font-bold">Money Wallet</p>
                <p className="text-sm text-muted-foreground">Used to buy digital goods from the store.</p>
              </div>
              <p className="ml-auto text-2xl font-bold text-green-600">{money === null ? '—' : `Rs ${money}`}</p>
            </div>
            <p className="mt-4 rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
              Tap <b>Add Money</b> on the green card above to top up. Good purchases are deducted from this balance —
              coins are never used for store items.
            </p>
          </FbCard>
        </TabsContent>
      </Tabs>

      {/* Add money dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !adding && setAddOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Money</DialogTitle>
            <DialogDescription>Top up your money wallet for digital goods.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (Rs)"
              aria-label="Amount in rupees"
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm font-medium transition-colors hover:bg-muted',
                    Number(amount) === v ? 'border-[#1877F2] text-[#1877F2]' : 'text-muted-foreground'
                  )}
                >
                  Rs {v}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={addMoney} disabled={!(Number(amount) > 0) || adding}>
              {adding ? 'Adding…' : 'Add Money'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
