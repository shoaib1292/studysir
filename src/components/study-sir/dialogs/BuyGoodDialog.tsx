'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Banknote, Download, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api, errorMessage } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import { SafeImage } from '../shared/SafeImage'

/**
 * Pay-from-money-wallet purchase dialog for digital goods.
 * On 402 (insufficient money) shows an inline alert with a shortcut to the
 * Money Wallet view.
 */
export function BuyGoodDialog({
  open,
  onOpenChange,
  good,
  balance,
  onBought,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  good: { id: string; title: string; price: number; image?: string | null }
  balance: number
  onBought: () => void
}) {
  const go = useAppStore((s) => s.go)
  const [loading, setLoading] = useState(false)
  const [insufficient, setInsufficient] = useState(false)

  const enough = balance >= good.price

  async function pay() {
    setLoading(true)
    try {
      await api.buyGood(good.id)
      toast.success('Purchase complete!', { description: 'Check your downloads.' })
      onOpenChange(false)
      onBought()
    } catch (e) {
      const err = e as { status?: number }
      if (err.status === 402) {
        setInsufficient(true)
      } else {
        toast.error('Purchase failed', { description: errorMessage(e) })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) {
          setInsufficient(false)
          onOpenChange(o)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy this item?</DialogTitle>
          <DialogDescription>You will download it instantly after purchase.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg bg-muted/70 p-3">
          <SafeImage src={good.image} alt={good.title} className="size-14 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{good.title}</p>
            <p className="text-lg font-extrabold">Rs {good.price}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/70 p-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4 text-green-600" />
            Pay from Money Wallet
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <Banknote className="size-4 text-green-600" />
            Rs {balance}
          </span>
        </div>

        {insufficient ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
            <span className="font-medium">
              Insufficient money — you need Rs {Math.max(0, good.price - balance)} more.
            </span>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => {
                onOpenChange(false)
                go('wallet', { tab: 'money' })
              }}
            >
              <Banknote className="size-4" />
              Money Wallet
            </Button>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={pay} disabled={!enough || loading} className="gap-1.5">
            <Download className="size-4" />
            {loading ? 'Paying…' : `Pay Rs ${good.price}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
