'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { AvailabilityDTO } from '@/lib/types'
import { EmptyState } from '../shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

export function TimingDialog({
  open,
  onOpenChange,
  teacherId,
  teacherName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherId: string
  teacherName: string
}) {
  const [loaded, setLoaded] = useState<{ key: string; items: AvailabilityDTO[] } | null>(null)
  // Derived: null while (re)loading for this dialog/teacher combo (shows the skeleton)
  const items =
    loaded && loaded.key === `${open}:${teacherId}` ? loaded.items : null

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const key = `${open}:${teacherId}`
    api
      .getUser(teacherId)
      .then((d) => {
        if (!cancelled) setLoaded({ key, items: d.availabilities })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [open, teacherId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Time Availability</DialogTitle>
          <DialogDescription>Weekly schedule for {teacherName}.</DialogDescription>
        </DialogHeader>

        {items === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-4/5 rounded-lg" />
            <Skeleton className="h-10 w-3/5 rounded-lg" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Clock} title="No schedule added" hint={`${teacherName} hasn't added availability yet.`} />
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-lg bg-muted/70 p-3">
                <Clock className="size-4 shrink-0 text-[#1877F2]" />
                <div className="min-w-0">
                  <p className="text-sm font-bold">{a.day}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.slots}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
