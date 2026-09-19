'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, PlayCircle, Youtube, X } from 'lucide-react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import type { CourseInput } from '@/lib/api'
import { compressImageFile } from '@/lib/image'
import { parseYouTubeUrl } from '@/lib/youtube'
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
  const [cover, setCover] = useState<string>('')
  const [language, setLanguage] = useState('')
  const [subject, setSubject] = useState('')
  const [duration, setDuration] = useState('')
  const [timing, setTiming] = useState('')
  const [classDuration, setClassDuration] = useState('')
  const [classesPerWeek, setClassesPerWeek] = useState('')
  const [format, setFormat] = useState('')
  const [fee, setFee] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  // videoKind: 'INTRO' = paid teaser (join to access) | 'FULL' = complete free course
  const [videoKind, setVideoKind] = useState<'INTRO' | 'FULL'>('INTRO')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live YouTube preview parsed from the URL the teacher is typing.
  const yt = videoUrl.trim() ? parseYouTubeUrl(videoUrl) : null
  const isFullFree = videoKind === 'FULL'
  // A full free-course video forces the fee to 0; an intro video requires a paid fee.
  const effectiveFee = isFullFree ? 0 : Number(fee) || 0
  const valid =
    title.trim().length > 2 &&
    description.trim().length > 2 &&
    (!yt || (yt && effectiveFee >= 0)) && // with a video, free is allowed
    (!yt || isFullFree ? effectiveFee >= 0 : effectiveFee > 0) // intro video must be paid
    ? true : false

  async function pickCover(file: File | undefined) {
    if (!file || uploading) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file')
      return
    }
    setUploading(true)
    try {
      const compressed = await compressImageFile(file)
      const { url } = await api.uploadImage('course-covers', compressed)
      setCover(url)
      toast.success('Cover uploaded')
    } catch (e) {
      toast.error('Could not upload cover', { description: errorMessage(e) })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function submit() {
    if (!valid || loading) return
    setLoading(true)
    try {
      const payload: CourseInput = {
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
        fee: isFullFree ? 0 : Number(fee) || 0,
      }
      if (yt) {
        payload.videoUrl = yt.watchUrl
        payload.videoKind = videoKind
      }
      await api.createCourse(payload)
      toast.success('Course published!', { description: yt ? (isFullFree ? 'Students can watch the free course now.' : 'Intro video live — students watch then send a Join Request.') : 'Students can now join your course.' })
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
    setCover('')
    setLanguage('')
    setSubject('')
    setDuration('')
    setTiming('')
    setClassDuration('')
    setClassesPerWeek('')
    setFormat('')
    setFee('')
    setVideoUrl('')
    setVideoKind('INTRO')
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
            {cover ? (
              <div className="relative overflow-hidden rounded-lg border">
                <SafeImage src={cover} alt="cover" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove cover"
                  onClick={() => setCover('')}
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-28 items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-[#1877F2] hover:text-[#1877F2] disabled:opacity-60"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? 'Uploading…' : 'Upload cover photo'}
              </button>
            )}
            {cover ? (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                Change cover
              </Button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                void pickCover(file)
              }}
            />
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
              <Label htmlFor="course-fee">Fee ($) {isFullFree ? '(free — full course)' : '*'}</Label>
              <Input
                id="course-fee"
                type="number"
                min={0}
                placeholder={isFullFree ? '0' : '15'}
                value={isFullFree ? '0' : fee}
                disabled={isFullFree}
                onChange={(e) => setFee(e.target.value)}
              />
              {isFullFree ? (
                <p className="text-[11px] text-muted-foreground">A full free-course video is free for everyone — no join request needed.</p>
              ) : null}
            </div>
          </div>

          {/* YouTube video attachment */}
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Youtube className="size-4 text-red-600" />
              <p className="text-sm font-semibold">YouTube video (optional)</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Paste a YouTube link to attach an intro video or a full free course. The thumbnail is auto-generated from the video.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="course-video" className="sr-only">YouTube link</Label>
              <Input
                id="course-video"
                placeholder="https://www.youtube.com/watch?v=…  or  https://youtu.be/…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              {videoUrl.trim() && !yt ? (
                <p className="text-[11px] text-red-600">That doesn't look like a YouTube link. Use a youtube.com/watch?v=… or youtu.be/… URL.</p>
              ) : null}
            </div>

            {yt ? (
              <RadioGroup
                value={videoKind}
                onValueChange={(v) => setVideoKind(v as 'INTRO' | 'FULL')}
                className="grid gap-2"
              >
                <label htmlFor="kind-intro" className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 has-[:checked]:border-[#1877F2] has-[:checked]:bg-[#1877F2]/5">
                  <RadioGroupItem value="INTRO" id="kind-intro" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Intro / teaser video <span className="text-muted-foreground">(paid course)</span></p>
                    <p className="text-[11px] text-muted-foreground">Students watch this preview, then send a Join Request to access the full course.</p>
                  </div>
                </label>
                <label htmlFor="kind-full" className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 has-[:checked]:border-[#1877F2] has-[:checked]:bg-[#1877F2]/5">
                  <RadioGroupItem value="FULL" id="kind-full" className="mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Full free course <span className="text-muted-foreground">(everyone can watch)</span></p>
                    <p className="text-[11px] text-muted-foreground">The complete course video is embedded on the card — anyone can watch it for free, no join request needed. Course fee becomes 0.</p>
                  </div>
                </label>
              </RadioGroup>
            ) : null}

            {yt ? (
              <div className="relative overflow-hidden rounded-lg border">
                <SafeImage src={yt.thumbnailHq} alt="YouTube preview" className="aspect-video w-full object-cover" />
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <PlayCircle className="size-3.5" />
                  {isFullFree ? 'Full free course' : 'Intro video'}
                </span>
              </div>
            ) : null}
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
