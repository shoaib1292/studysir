'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { COVER_OPTIONS } from '../shared/constants'
import { SafeImage } from '../shared/SafeImage'

export function PostCourseDialog({
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
  const [cover, setCover] = useState<string>(COVER_OPTIONS[0])
  const [language, setLanguage] = useState('')
  const [subject, setSubject] = useState('')
  const [duration, setDuration] = useState('')
  const [timing, setTiming] = useState('')
  const [classDuration, setClassDuration] = useState('')
  const [classesPerWeek, setClassesPerWeek] = useState('')
  const [format, setFormat] = useState('')
  const [fee, setFee] = useState('')
  const [loading, setLoading] = useState(false)

  const valid = title.trim().length > 2 && description.trim().length > 2 && (Number(fee) || 0) > 0

  async function submit() {
    if (!valid || loading) return
    setLoading(true)
    try {
      await api.createCourse({
        title: title.trim(),
        description: description.trim(),
        cover: cover || undefined,
        language: language.trim() || undefined,
        subject: subject.trim() || undefined,
        duration: duration.trim() || undefined,
        timing: timing.trim() || undefined,
        classDuration: classDuration.trim() || undefined,
        classesPerWeek: classesPerWeek.trim() || undefined,
        format: format.trim() || undefined,
        fee: Number(fee) || 0,
      })
      toast.success('Course published!', { description: 'Students can now join your course.' })
      onOpenChange(false)
      onPosted()
      reset()
    } catch (e) {
      toast.error('Could not publish course', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setTitle('')
    setDescription('')
    setCover(COVER_OPTIONS[0])
    setLanguage('')
    setSubject('')
    setDuration('')
    setTiming('')
    setClassDuration('')
    setClassesPerWeek('')
    setFormat('')
    setFee('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a Course</DialogTitle>
          <DialogDescription>Offer a structured course to learners on StudySir.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="course-title">Title *</Label>
            <Input id="course-title" placeholder="e.g. Spoken English Course" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="course-desc">Description *</Label>
            <Textarea id="course-desc" placeholder="What will students learn? How are classes run?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label>Cover image</Label>
            <div className="grid grid-cols-3 gap-2">
              {COVER_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCover(c)}
                  className={cn(
                    'overflow-hidden rounded-lg border-2 transition-all',
                    cover === c ? 'border-[#1877F2] ring-2 ring-[#1877F2]/30' : 'border-transparent hover:border-muted-foreground/30'
                  )}
                >
                  <SafeImage src={c} alt="cover" className="aspect-video w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="course-lang">Language</Label>
              <Input id="course-lang" placeholder="English, Hindi" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-subject">Subject</Label>
              <Input id="course-subject" placeholder="Spoken English" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-duration">Duration for course</Label>
              <Input id="course-duration" placeholder="2 Months" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-timing">Timing</Label>
              <Input id="course-timing" placeholder="4 pm to 6 pm" value={timing} onChange={(e) => setTiming(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-classduration">Class duration</Label>
              <Input id="course-classduration" placeholder="60:00 mins" value={classDuration} onChange={(e) => setClassDuration(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-perweek">Classes per week</Label>
              <Input id="course-perweek" placeholder="3 Days" value={classesPerWeek} onChange={(e) => setClassesPerWeek(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-format">Course format</Label>
              <Input id="course-format" placeholder="Group classes via Google Meet" value={format} onChange={(e) => setFormat(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="course-fee">Fee ($) *</Label>
              <Input id="course-fee" type="number" min={0} placeholder="15" value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || loading}>
            {loading ? 'Publishing…' : 'Publish Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
