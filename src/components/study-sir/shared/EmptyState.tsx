'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="card-shadow flex flex-col items-center justify-center gap-2 rounded-xl bg-card px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-[#1877F2]/10">
        <Icon className="size-7 text-[#1877F2]" />
      </div>
      <p className="font-semibold">{title}</p>
      {hint ? <p className="max-w-xs text-sm text-muted-foreground">{hint}</p> : null}
      {action}
    </div>
  )
}
