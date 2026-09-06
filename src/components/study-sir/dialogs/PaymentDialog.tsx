'use client'

// Add-money flow (requirements B + G): pay a platform bank account, upload the
// payment screenshot, and the money wallet is credited after admin verification.
//
// NOTE (UX fix): the submit button is ALWAYS clickable — validation runs on tap
// with a precise toast telling the user exactly what is still missing. A silently
// disabled button after uploading the screenshot was reported as a bug.
import { useEffect, useState } from 'react'
import {
  Banknote,
  Clock3,
  Copy,
  Check,
  ImagePlus,
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
import { Label } from '@/components/ui/label'
import { api, errorMessage } from '@/lib/api'
import type { BankAccountDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { fileToCompactDataUrl } from '@/lib/image'
import { useMoney } from '@/store/useCurrencyStore'
import { useAppStore } from '@/store/useAppStore'

const STUDENT_QUICK = [500, 1000, 2500, 5000]
export const MIN_TOPUP = 100

export function PaymentDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone?: () => void
}) {
  const me = useAppStore((s) => s.me)!
  const refreshMe = useAppStore((s) => s.refreshMe)
  const { fmt } = useMoney(me)

  const [accounts, setAccounts] = useState<BankAccountDTO[]>([])
  const [method, setMethod] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const payAmount = Number(amount) || 0
  const ready = !!method && !!screenshot && payAmount >= MIN_TOPUP

  useEffect(() => {
    if (!open || accounts.length) return
    setLoadingAccounts(true)
    api
      .getBankAccounts()
      .then((d) => setAccounts(d.accounts))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false))
  }, [open, accounts.length])

  function reset() {
    setMethod('')
    setAmount('')
    setReference('')
    setScreenshot('')
    setBusy(false)
  }

  async function pickScreenshot(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await fileToCompactDataUrl(file)
      setScreenshot(dataUrl)
      toast.success('Screenshot attached')
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
    // Precise, ordered validation — the button is never silently dead.
    if (payAmount < MIN_TOPUP) {
      return toast.error(`Minimum top-up is PKR ${MIN_TOPUP.toLocaleString()}`, {
        description: 'Enter the amount you transferred (at least PKR 100).',
      })
    }
    if (!method) {
      return toast.error('Select the account you paid from', {
        description: 'Tap one of the platform bank accounts in step 2.',
      })
    }
    if (!screenshot) {
      return toast.error('Upload the payment screenshot', {
        description: 'Attach the transfer receipt in step 3 so we can verify your payment.',
      })
    }
    setBusy(true)
    try {
      await api.topUp({
        kind: 'STUDENT_MONEY',
        amount: payAmount,
        method,
        reference: reference.trim() || undefined,
        screenshot,
      })
      toast.success('Payment proof submitted', {
        description: 'Your money is added after the platform verifies the screenshot.',
      })
      await refreshMe()
      onDone?.()
      onOpenChange(false)
      reset()
    } catch (e) {
      toast.error('Could not submit payment', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5 text-green-600" />
            Add Money — Bank Transfer
          </DialogTitle>
          <DialogDescription>
            Pay to a platform account and upload the screenshot — your wallet is credited after verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 — amount */}
          <div className="space-y-2">
            <Label htmlFor="topup-amount">1 · Amount paid (PKR)</Label>
            <Input
              id="topup-amount"
              type="number"
              min={MIN_TOPUP}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1000"
              aria-label="Amount paid in PKR"
            />
            <div className="flex flex-wrap gap-1.5">
              {STUDENT_QUICK.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted',
                    payAmount === v ? 'border-[#1877F2] bg-blue-500/10 text-[#1877F2]' : 'text-muted-foreground'
                  )}
                >
                  PKR {v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — platform accounts */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">2 · Pay to a platform account</p>
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

          {/* Step 3 — screenshot */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">3 · Upload payment screenshot</p>
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
              You pay <b>{fmt(payAmount)}</b> — your wallet is credited once an admin verifies the screenshot (usually
              within 24h). Coins are never bought here — teachers get coins through Premium Plans.
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy}
            className={cn(!ready && !busy && 'bg-amber-500 hover:bg-amber-600 text-white')}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Clock3 className="mr-1.5 size-4" /> Submit for verification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
