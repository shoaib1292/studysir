'use client'

// AdminView → Economy tab: exchange rates (D), platform bank accounts (G),
// commission setting and the 1,000-paid-teachers milestone bonus (F).

import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Landmark,
  Loader2,
  PartyPopper,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api, errorMessage } from '@/lib/api'
import type { AdminSettingsDTO, BankAccountDTO, RateDTO } from '@/lib/types'
import { cn } from '@/lib/utils'

const PREVIEW_PKR = 2800
const PREVIEW_CODES = ['USD', 'EUR', 'INR'] as const

/** Amounts for "A 2,800 PKR tuition shows as $10.00 / €9.18 / ₹835.82" — null when any rate is missing/invalid. */
function previewAmounts(rates: RateDTO[]): string | null {
  const parts: string[] = []
  for (const code of PREVIEW_CODES) {
    const r = rates.find((x) => x.code === code)
    if (!r || !(r.pkrPer > 0)) return null
    parts.push(
      `${r.symbol}${(PREVIEW_PKR / r.pkrPer).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    )
  }
  return parts.join(' / ')
}

// ===== shared card shell (mirrors AnalyticsTab Panel + refresh) =====

function SectionCard({
  title,
  icon: Icon,
  hint,
  action,
  loading,
  onRefresh,
  children,
}: {
  title: string
  icon: typeof Percent
  hint?: string
  action?: React.ReactNode
  loading?: boolean
  onRefresh?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1877F2]/10 text-[#1877F2] dark:text-blue-400">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-tight">{title}</h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
        {onRefresh ? (
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={onRefresh}
            disabled={loading}
            aria-label={`Refresh ${title}`}
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

// ===== 1. Exchange rates (requirement D) =====

function RatesCard() {
  const [rates, setRates] = useState<RateDTO[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingCode, setSavingCode] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminRates()
      setRates(d.rates)
      setDrafts(Object.fromEntries(d.rates.map((r) => [r.code, String(r.pkrPer)])))
    } catch (e) {
      toast.error('Could not load exchange rates', { description: errorMessage(e) })
      setRates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(code: string) {
    const value = Number(drafts[code])
    if (!drafts[code] || !Number.isFinite(value) || value <= 0) {
      toast.error('Invalid rate', {
        description: `Enter how many PKR one ${code} is worth (a positive number).`,
      })
      return
    }
    setSavingCode(code)
    try {
      const d = await api.adminUpdateRate(code, value)
      toast.success(`1 ${code} = ${d.rate.pkrPer} PKR saved`)
      await load()
    } catch (e) {
      toast.error('Could not update rate', { description: errorMessage(e) })
    } finally {
      setSavingCode(null)
    }
  }

  const preview = rates ? previewAmounts(rates) : null

  return (
    <SectionCard
      title="Exchange rates"
      icon={Coins}
      hint="How many PKR one unit is worth."
      loading={loading}
      onRefresh={() => void load()}
    >
      {rates === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No rates configured.
        </p>
      ) : (
        <div>
          <div className="divide-y">
            {rates.map((r) => {
              const base = r.code === 'PKR'
              return (
                <div key={r.code} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold">
                    {r.symbol}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      {r.code}
                      {base ? (
                        <Badge className="border-transparent bg-green-500/15 px-1.5 text-[10px] font-bold text-green-700 dark:text-green-300">
                          base currency
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.label}</p>
                  </div>
                  {base ? (
                    <span className="text-sm font-bold tabular-nums" title="PKR is the base currency">
                      1
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Input
                        inputMode="decimal"
                        className="h-8 w-24 text-right text-sm tabular-nums"
                        value={drafts[r.code] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.code]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void save(r.code)
                        }}
                        disabled={savingCode !== null}
                        aria-label={`PKR per 1 ${r.code}`}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8 shrink-0"
                        disabled={savingCode !== null}
                        onClick={() => void save(r.code)}
                        aria-label={`Save ${r.code} rate`}
                      >
                        {savingCode === r.code ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {preview ? (
            <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Live preview:</span> A{' '}
              {PREVIEW_PKR.toLocaleString('en-US')} PKR tuition shows as{' '}
              <span className="font-semibold text-foreground">{preview}</span>
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  )
}

// ===== 2. Platform bank accounts (requirement G) =====

const EMPTY_BANK_FORM = { bankName: '', accountTitle: '', accountNumber: '', instructions: '' }

function BankAccountsCard() {
  const [accounts, setAccounts] = useState<BankAccountDTO[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_BANK_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminBankAccounts()
      setAccounts(d.accounts)
    } catch (e) {
      toast.error('Could not load bank accounts', { description: errorMessage(e) })
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const formValid =
    form.bankName.trim().length > 0 && form.accountTitle.trim().length > 0 && form.accountNumber.trim().length > 0

  async function copyAccount(a: BankAccountDTO) {
    try {
      await navigator.clipboard.writeText(a.accountNumber)
      toast.success('Account number copied', { description: `${a.bankName} — ${a.accountNumber}` })
    } catch {
      toast.error('Could not copy', { description: `Copy it manually: ${a.accountNumber}` })
    }
  }

  async function setActive(a: BankAccountDTO, active: boolean) {
    setTogglingId(a.id)
    try {
      await api.adminUpdateBankAccount(a.id, { active })
      toast.success(active ? `${a.bankName} shown on payment dialogs` : `${a.bankName} hidden from payment dialogs`)
      await load()
    } catch (e) {
      toast.error('Could not update account', { description: errorMessage(e) })
    } finally {
      setTogglingId(null)
    }
  }

  async function remove(id: string) {
    setDeletingId(id)
    try {
      await api.adminDeleteBankAccount(id)
      toast.success('Bank account deleted')
      await load()
    } catch (e) {
      toast.error('Could not delete account', { description: errorMessage(e) })
    } finally {
      setDeletingId(null)
    }
  }

  async function create() {
    if (!formValid) return
    setCreating(true)
    try {
      await api.adminCreateBankAccount({
        bankName: form.bankName.trim(),
        accountTitle: form.accountTitle.trim(),
        accountNumber: form.accountNumber.trim(),
        instructions: form.instructions.trim() || null,
      })
      toast.success('Bank account added', {
        description: `${form.bankName.trim()} now appears on payment dialogs.`,
      })
      setAddOpen(false)
      setForm(EMPTY_BANK_FORM)
      await load()
    } catch (e) {
      toast.error('Could not add account', { description: errorMessage(e) })
    } finally {
      setCreating(false)
    }
  }

  return (
    <SectionCard
      title="Platform bank accounts"
      icon={Landmark}
      hint="Shown to users on top-up & withdrawal payment dialogs."
      loading={loading}
      onRefresh={() => void load()}
      action={
        <Dialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o)
            if (!o) setForm(EMPTY_BANK_FORM)
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1.5">
              <Plus className="size-4" />
              Add account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add platform bank account</DialogTitle>
              <DialogDescription>
                Users will copy these details when paying for coins or adding money.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ba-bank">Bank name</Label>
                <Input
                  id="ba-bank"
                  value={form.bankName}
                  maxLength={120}
                  placeholder="e.g. Meezan Bank"
                  onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ba-title">Account title</Label>
                <Input
                  id="ba-title"
                  value={form.accountTitle}
                  maxLength={120}
                  placeholder="e.g. StudySir Pvt Ltd"
                  onChange={(e) => setForm((f) => ({ ...f, accountTitle: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ba-number">Account number</Label>
                <Input
                  id="ba-number"
                  value={form.accountNumber}
                  maxLength={60}
                  placeholder="e.g. PK36SCBL0000001123456702"
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ba-instructions">Instructions (optional)</Label>
                <Textarea
                  id="ba-instructions"
                  value={form.instructions}
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Send the transaction screenshot with your name as reference."
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button className="gap-1.5" disabled={creating || !formValid} onClick={() => void create()}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {accounts === null ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No accounts yet — add one so users see where to send payments.
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-lg border p-2.5 transition-opacity',
                !a.active && 'opacity-70',
                deletingId === a.id && 'pointer-events-none opacity-50'
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1877F2]/10 text-[#1877F2] dark:text-blue-400">
                <Landmark className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                  {a.bankName}
                  {!a.active ? (
                    <span className="rounded bg-muted px-1.5 py-px text-[10px] font-bold text-muted-foreground">
                      INACTIVE
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.accountTitle} · <span className="font-mono">{a.accountNumber}</span>
                </p>
                {a.instructions ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.instructions}</p>
                ) : null}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                onClick={() => void copyAccount(a)}
                aria-label={`Copy ${a.bankName} account number`}
              >
                <Copy className="size-3.5" />
              </Button>
              <label className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Active</span>
                <Switch
                  checked={a.active}
                  disabled={togglingId === a.id || deletingId === a.id}
                  onCheckedChange={(v) => void setActive(a, v)}
                  aria-label={`${a.active ? 'Hide' : 'Show'} ${a.bankName} on payment dialogs`}
                />
              </label>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                    disabled={deletingId === a.id}
                    aria-label={`Delete ${a.bankName} account`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {a.bankName} account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Users will no longer see this account on payment dialogs. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                      onClick={() => void remove(a.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ===== 3. Commission & settings =====

function CommissionCard() {
  const [settings, setSettings] = useState<AdminSettingsDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminSettings()
      setSettings(d)
      setDraft(String(d.commissionRate))
    } catch (e) {
      toast.error('Could not load settings', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    const value = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(value) || value < 0 || value > 50) {
      toast.error('Invalid commission', { description: 'Enter a percentage between 0 and 50.' })
      return
    }
    setSaving(true)
    try {
      const d = await api.adminUpdateSettings({ commissionRate: value })
      toast.success(`Commission set to ${d.commissionRate}%`)
      await load()
    } catch (e) {
      toast.error('Could not save commission', { description: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard title="Commission" icon={Percent} loading={loading} onRefresh={() => void load()}>
      {settings === null ? (
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      ) : (
        <div>
          <div className="flex items-end gap-2">
            <div className="grid flex-1 gap-1.5 sm:flex-none">
              <Label htmlFor="commission-input">Commission rate</Label>
              <div className="relative sm:w-32">
                <Input
                  id="commission-input"
                  inputMode="decimal"
                  className="pr-8 text-right tabular-nums"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void save()
                  }}
                  disabled={saving}
                  aria-label="Commission rate percent"
                />
                <Percent className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <Button className="shrink-0 gap-1.5" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Save
            </Button>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Commission cut from digital-product sales — the seller receives the rest.
          </p>
        </div>
      )}
    </SectionCard>
  )
}

// ===== 4. Milestone (requirement F) =====

function MilestoneCard() {
  const [data, setData] = useState<{ paidTeachers: number; target: number; milestonePaid: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.adminMilestone())
    } catch (e) {
      toast.error('Could not load milestone', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function pay() {
    setPaying(true)
    try {
      const d = await api.adminPayMilestone()
      toast.success('Milestone bonus paid 🎉', {
        description: `${d.teachers} teacher${d.teachers === 1 ? '' : 's'} got every coin they spent back.`,
      })
      setConfirmOpen(false)
      await load()
    } catch (e) {
      // 403 (owner only) / 409 (already paid or target not reached) — surface the server message.
      toast.error('Could not pay milestone', { description: errorMessage(e) })
    } finally {
      setPaying(false)
    }
  }

  const fmt = (n: number) => n.toLocaleString('en-US')
  const paid = data?.paidTeachers ?? 0
  const target = data?.target ?? 1000
  const pct = target > 0 ? Math.min(100, Math.max(0, Math.round((paid / target) * 100))) : 0
  const unlocked = paid >= target

  return (
    <SectionCard
      title="Milestone — 1,000 paid teachers"
      icon={Trophy}
      hint="A one-time celebration payout for the platform."
      loading={loading}
      onRefresh={() => void load()}
    >
      {data === null ? (
        <div className="space-y-2.5">
          <Skeleton className="h-5 w-2/3 rounded" />
          <Skeleton className="h-2.5 rounded-full" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">
              Paid teachers: {fmt(paid)} / {fmt(target)}
            </p>
            {data.milestonePaid ? (
              <Badge className="border-transparent bg-green-500/15 text-green-700 dark:text-green-300">
                Bonus paid 🎉
              </Badge>
            ) : (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{pct}%</span>
            )}
          </div>
          <Progress value={pct} aria-label={`Milestone progress ${pct}%`} className="h-2.5" />

          {!data.milestonePaid && !unlocked ? (
            <p className="text-xs text-muted-foreground">
              Unlocks at {fmt(target)} paid teachers — teachers who have ever bought coins.
            </p>
          ) : null}

          {data.milestonePaid ? (
            <Button size="lg" className="w-full gap-2" disabled>
              <CheckCircle2 className="size-5" />
              Milestone bonus paid
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn('block w-full', !unlocked && 'cursor-not-allowed')}>
                  <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <PopoverTrigger asChild>
                      {/* pointer-events-none while locked lets hover reach the tooltip span */}
                      <Button
                        size="lg"
                        className={cn('w-full gap-2', !unlocked && 'pointer-events-none')}
                        disabled={!unlocked || paying}
                      >
                        {paying ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <PartyPopper className="size-5" />
                        )}
                        Pay milestone bonus — refund spent coins
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="center" className="w-80 space-y-3">
                      <p className="text-sm font-semibold">Pay the milestone bonus?</p>
                      <p className="text-xs text-muted-foreground">
                        Every teacher who paid coins gets back all the coins they spent on accepting
                        requests. This can only be done once.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={paying}
                          className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                          onClick={() => void pay()}
                        >
                          Confirm payout
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </span>
              </TooltipTrigger>
              {!unlocked ? (
                <TooltipContent>Unlocks at {fmt(target)} paid teachers</TooltipContent>
              ) : null}
            </Tooltip>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ===== tab layout =====

export function EconomyTab() {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <div className="grid items-start gap-3">
        <RatesCard />
        <BankAccountsCard />
      </div>
      <div className="grid items-start gap-3">
        <CommissionCard />
        <MilestoneCard />
      </div>
    </div>
  )
}
