'use client'

import { useState } from 'react'
import { Flag, ShieldCheck } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import type { ReportTargetType } from '@/lib/types'

const REASONS = ['Spam', 'Scam or Fraud', 'Inappropriate Content', 'Copyright', 'Harassment', 'Misinformation', 'Other']

export interface ReportTarget {
  type: ReportTargetType
  /** id of the reported content (good/course/tuition id, or connectionId for chats) */
  targetId?: string
  /** id of the accused user */
  targetUserId?: string
  connectionId?: string
  /** human label shown in the dialog ("Class 10 Math Formula Sheet", "Noman Ali"…) */
  label: string
}

export function ReportDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ReportTarget | null
}) {
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  const valid = Boolean(reason)

  function reset() {
    setReason('')
    setDetails('')
  }

  async function submit() {
    if (!valid || !target || loading) return
    setLoading(true)
    try {
      await api.createReport({
        targetType: target.type,
        targetId: target.targetId,
        targetUserId: target.targetUserId,
        connectionId: target.connectionId,
        reason,
        details: details.trim() || undefined,
      })
      toast.success('Report submitted', {
        description: 'Our moderation team will review it shortly. Thank you for keeping StudySir safe.',
        icon: <ShieldCheck className="size-4" />,
      })
      onOpenChange(false)
      reset()
    } catch (e) {
      toast.error('Could not submit report', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="size-4 text-red-500" />
            Report {target?.type === 'CHAT' ? 'conversation' : 'content'}
          </DialogTitle>
          <DialogDescription>
            {target ? (
              <>
                You are reporting <span className="font-semibold text-foreground">{target.label}</span>. Reports are
                reviewed by moderators and kept confidential.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a reason…" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              rows={3}
              maxLength={1000}
              placeholder="Add any context that helps moderators…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!valid || loading}
            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {loading ? 'Submitting…' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
