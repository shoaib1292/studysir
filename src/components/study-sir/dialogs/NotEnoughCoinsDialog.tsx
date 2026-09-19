'use client'

import { Coins, Crown } from 'lucide-react'
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

export function NotEnoughCoinsDialog({
  open,
  onOpenChange,
  needed,
  balance,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  needed: number
  balance: number
}) {
  const go = useAppStore((s) => s.go)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-1 grid size-14 place-items-center rounded-full bg-amber-500/15">
            <Coins className="size-7 text-amber-500" />
          </div>
          <DialogTitle className="text-center">Not enough coins</DialogTitle>
          <DialogDescription className="text-center">
            You need <b>{needed} coins</b> for this action but your balance is <b>{balance} coins</b>. Coins come only
            with a Premium Plan — pick a plan to top up and unlock every coin action.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-center gap-2 sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              go('plans')
            }}
          >
            <Crown className="size-4" />
            View Premium Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

