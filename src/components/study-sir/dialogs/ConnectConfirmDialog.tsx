'use client'

import type { LucideIcon } from 'lucide-react'
import { Coins, Info, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/store/useAppStore'
import { REFUND_RULE_TEXT } from '../shared/constants'

/**
 * Confirmation dialog for paid/unpaid connection actions.
 * cost=0 renders a FREE request view (no coin math, no buy-coins hatch).
 */
export function ConnectConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  cost,
  balance,
  confirmLabel = 'Confirm',
  confirmIcon: ConfirmIcon = Send,
  loading = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message?: string
  cost: number
  balance: number
  confirmLabel?: string
  confirmIcon?: LucideIcon
  loading?: boolean
  onConfirm: () => void
}) {
  const go = useAppStore((s) => s.go)
  const free = cost <= 0
  const enough = balance >= cost

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {message ? <DialogDescription>{message}</DialogDescription> : null}
        </DialogHeader>

        {free ? (
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            <span className="font-semibold">Cost for you</span>
            <span className="flex items-center gap-1 font-bold">
              <Coins className="size-4" />
              FREE
            </span>
          </div>
        ) : (
          <div className="space-y-1.5 rounded-lg bg-muted/70 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connection cost</span>
              <span className="flex items-center gap-1 font-semibold">
                <Coins className="size-4 text-amber-500" />
                {cost} coins
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your balance</span>
              <span className="flex items-center gap-1 font-semibold">
                <Coins className="size-4 text-amber-500" />
                {balance} coins
              </span>
            </div>
            {enough ? (
              <div className="flex items-center justify-between border-t pt-1.5">
                <span className="text-muted-foreground">After this action</span>
                <span className="flex items-center gap-1 font-bold">
                  <Coins className="size-4 text-amber-500" />
                  {balance - cost} coins
                </span>
              </div>
            ) : null}
          </div>
        )}

        {!free ? (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-[#1877F2]" />
            {REFUND_RULE_TEXT}
          </p>
        ) : null}

        {!free && !enough ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <span className="font-medium">Not enough coins in your wallet.</span>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false)
                go('plans')
              }}
            >
              Get Premium Plan
            </Button>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={!enough || loading} onClick={onConfirm} className="gap-2">
            {loading ? 'Please wait…' : (
              <>
                <ConfirmIcon className="size-4" />
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
