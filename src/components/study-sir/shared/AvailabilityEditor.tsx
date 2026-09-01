'use client'

import { useState } from 'react'
import { CalendarClock, Clock, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, errorMessage } from '@/lib/api'
import type { AvailabilityDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { toast } from 'sonner'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

interface Row {
  key: string
  day: string
  slots: string
}

function toRows(list: AvailabilityDTO[]): Row[] {
  return list.map((a, i) => ({ key: `${a.id ?? 'row'}-${i}`, day: a.day, slots: a.slots }))
}

export function AvailabilityEditor({
  initial,
  onChange,
}: {
  initial: AvailabilityDTO[]
  onChange?: (rows: { day: string; slots: string }[]) => void
}) {
  const me = useAppStore((s) => s.me)
  const [rows, setRows] = useState<Row[]>(() => toRows(initial))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  function usedDays() {
    return new Set(rows.map((r) => r.day))
  }

  /** DAYS plus any legacy/custom day values already on rows (e.g. "Mon, Wed, Fri"). */
  function dayOptions(): string[] {
    const extra = rows.map((r) => r.day).filter((d) => d && !(DAYS as readonly string[]).includes(d))
    return [...DAYS, ...extra]
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
    setDirty(true)
  }

  function addRow() {
    const free = DAYS.find((d) => !usedDays().has(d)) ?? 'Monday'
    setRows((rs) => [...rs, { key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, day: free, slots: '' }])
    setDirty(true)
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key))
    setDirty(true)
  }

  function emit(rows: Row[]) {
    onChange?.(rows.filter((r) => r.day && r.slots.trim()).map((r) => ({ day: r.day, slots: r.slots })))
  }

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const payload = rows
        .filter((r) => r.day && r.slots.trim())
        .map((r) => ({ day: r.day, slots: r.slots.trim() }))
      const res = await api.updateProfile(me.id, { availabilities: payload })
      setRows(toRows(res.availabilities ?? []))
      setDirty(false)
      toast.success('Availability saved', {
        description: payload.length
          ? `Students can reach you on ${payload.length} day${payload.length > 1 ? 's' : ''}.`
          : 'Your schedule is now empty.',
      })
    } catch (e) {
      toast.error('Could not save availability', { description: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          No availability yet. Add the days and times students can reach you.
        </div>
      )}

      <ul className="space-y-2" aria-label="Availability rows">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2">
            <Clock className="mx-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Select value={r.day} onValueChange={(v) => update(r.key, { day: v })}>
              <SelectTrigger className="w-[130px] shrink-0 bg-muted/50" aria-label="Day of week">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {dayOptions().map((d) => (
                  <SelectItem key={d} value={d} disabled={usedDays().has(d) && r.day !== d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={r.slots}
              onChange={(e) => update(r.key, { slots: e.target.value })}
              onBlur={() => emit(rows)}
              placeholder="5 pm to 8 pm"
              aria-label={`Time slots for ${r.day}`}
              className="bg-muted/50"
              maxLength={60}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeRow(r.key)}
              aria-label={`Remove ${r.day}`}
              className="size-9 shrink-0 rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={rows.length >= 7}
          className="rounded-full"
        >
          <Plus className="size-4" aria-hidden />
          Add day
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !dirty} className="rounded-full px-5">
          {saving ? 'Saving…' : 'Save schedule'}
        </Button>
      </div>
    </div>
  )
}
