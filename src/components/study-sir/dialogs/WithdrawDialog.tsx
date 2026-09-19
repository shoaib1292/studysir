'use client'

// Withdrawal request (requirement B): min 1,000 PKR, manual bank delivery,
// requires account number + account title + bank name. Admin approves/rejects.
import { useState } from 'react'
import { Banknote, Landmark, Loader2, Info } from 'lucide-react'
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
import { MIN_WITHDRAW_PKR } from '@/lib/currency'
import { useMoney } from '@/store/useCurrencyStore'
import { useAppStore } from '@/store/useAppStore'

export function WithdrawDialog({
  open,
  onOpenChange,
  balance,
  bankDetails,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  balance: number
  bankDetails: { bankName: string | null; accountTitle: string | null; accountNumber: string | null }
  onDone?: () => void
}) {
  const me = useAppStore((s) => s.me)!
  const { fmt } = useMoney(me)
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState(bankDetails.bankName ?? '')
  const [accountTitle, setAccountTitle] = useState(bankDetails.accountTitle ?? '')
  const [accountNumber, setAccountNumber] = useState(bankDetails.accountNumber ?? '')
  const [busy, setBusy] = useState(false)

  const value = Number(amount) || 0
  const valid = value >= MIN_WITHDRAW_PKR && value <= balance && bankName.trim() && accountTitle.trim() && accountNumber.trim()

  async function submit() {
    setBusy(true)
    try {
      await api.withdraw({
        amount: Math.round(value),
        bankName: bankName.trim(),
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
      })
      toast.success('Withdrawal requested', {
        description: `PKR ${Math.round(value).toLocaleString()} is on hold — we deliver manually to your ${bankName.trim()} account after review.`,
      })
      onOpenChange(false)
      setAmount('')
      onDone?.()
    } catch (e) {
      toast.error('Could not request withdrawal', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-5 text-green-600 dark:text-green-400" />
            Withdraw Money
          </DialogTitle>
          <DialogDescription>
            Minimum withdrawal is PKR {MIN_WITHDRAW_PKR.toLocaleString()} — the amount is held until an admin reviews it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wd-amount">Amount (PKR)</Label>
            <Input
              id="wd-amount"
              type="number"
              min={MIN_WITHDRAW_PKR}
              max={Math.floor(balance)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`e.g. ${MIN_WITHDRAW_PKR}`}
            />
            <p className="text-xs text-muted-foreground">
              Available: <b>{fmt(balance)}</b> · Requested: <b>{fmt(value)}</b>
            </p>
          </div>

          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-sm font-semibold">Bank account details</p>
            <div className="space-y-1.5">
              <Label htmlFor="wd-bank" className="text-xs">
                Bank name
              </Label>
              <Input
                id="wd-bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HBL, JazzCash, Easypaisa"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wd-title" className="text-xs">
                Account title
              </Label>
              <Input
                id="wd-title"
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                placeholder="Exact name on the account"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wd-number" className="text-xs">
                Account number / IBAN
              </Label>
              <Input
                id="wd-number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. PK36SCBL0000001123456702"
              />
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-blue-500/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-[#1877F2]" />
            Withdrawals are delivered manually by our team after verification. Your details are saved for next time.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || busy} className="bg-green-600 hover:bg-green-700">
            {busy ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" /> Requesting…
              </>
            ) : (
              <>
                <Banknote className="mr-1.5 size-4" /> Request {fmt(value)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
