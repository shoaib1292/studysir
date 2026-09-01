'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Coins } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import { clientCoinCost } from '../shared/constants'

export function PostTuitionDialog({
  open,
  onOpenChange,
  onPosted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPosted: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'ONLINE' | 'HOME' | 'CENTER'>('ONLINE')
  const [city, setCity] = useState('')
  const [subjects, setSubjects] = useState('')
  const [languages, setLanguages] = useState('')
  const [qualification, setQualification] = useState('')
  const [feeMin, setFeeMin] = useState('5')
  const [feeMax, setFeeMax] = useState('100')
  const [timing, setTiming] = useState('')
  const [loading, setLoading] = useState(false)

  const min = Number(feeMin) || 0
  const max = Number(feeMax) || 0
  const estimated = clientCoinCost(min, max, mode)

  const valid = title.trim().length > 2 && description.trim().length > 2 && min > 0 && max >= min

  async function submit() {
    if (!valid || loading) return
    setLoading(true)
    try {
      await api.createTuition({
        title: title.trim(),
        description: description.trim(),
        mode,
        city: city.trim() || undefined,
        subjects: subjects.trim() || undefined,
        languages: languages.trim() || undefined,
        qualification: qualification.trim() || undefined,
        feeMin: min,
        feeMax: max,
        timing: timing.trim() || undefined,
      })
      toast.success('Tuition posted!', { description: 'Teachers can now contact you using coins.' })
      onOpenChange(false)
      onPosted()
      reset()
    } catch (e) {
      toast.error('Could not post tuition', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setTitle('')
    setDescription('')
    setMode('ONLINE')
    setCity('')
    setSubjects('')
    setLanguages('')
    setQualification('')
    setFeeMin('5')
    setFeeMax('100')
    setTiming('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Tuition</DialogTitle>
          <DialogDescription>Describe what you need — posting is completely free.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tuition-title">Title *</Label>
            <Input id="tuition-title" placeholder="e.g. Online Class 10th Math teacher needed" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tuition-desc">Description *</Label>
            <Textarea id="tuition-desc" placeholder="Tell teachers about the student, subjects, location and expectations…" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as 'ONLINE' | 'HOME' | 'CENTER')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="HOME">Home</SelectItem>
                  <SelectItem value="CENTER">Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tuition-city">City</Label>
              <Input id="tuition-city" placeholder="e.g. Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tuition-subjects">Subjects</Label>
              <Input id="tuition-subjects" placeholder="Math, English" value={subjects} onChange={(e) => setSubjects(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tuition-languages">Languages</Label>
              <Input id="tuition-languages" placeholder="English, Hindi" value={languages} onChange={(e) => setLanguages(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tuition-qual">Required qualification</Label>
              <Input id="tuition-qual" placeholder="e.g. Bachelors" value={qualification} onChange={(e) => setQualification(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tuition-timing">Timing</Label>
              <Input id="tuition-timing" placeholder="e.g. 6 pm to 9 pm" value={timing} onChange={(e) => setTiming(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tuition-feemin">Fee min ($) *</Label>
              <Input id="tuition-feemin" type="number" min={0} value={feeMin} onChange={(e) => setFeeMin(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tuition-feemax">Fee max ($) *</Label>
              <Input id="tuition-feemax" type="number" min={0} value={feeMax} onChange={(e) => setFeeMax(e.target.value)} />
            </div>
          </div>

          <p className="flex items-center gap-1.5 rounded-lg bg-muted/70 p-2.5 text-xs text-muted-foreground">
            <Coins className="size-3.5 shrink-0 text-amber-500" />
            Free for you — teachers will spend about <b className="text-foreground">{estimated} coins</b> to contact
            you (based on fee weight).
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || loading}>
            {loading ? 'Posting…' : 'Post Tuition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
