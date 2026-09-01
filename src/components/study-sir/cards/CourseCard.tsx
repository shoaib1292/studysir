'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flag,
  HelpCircle,
  Languages,
  MessagesSquare,
  MoreVertical,
  Presentation,
  Repeat2,
  MessageSquareText,
  MonitorPlay,
  ThumbsUp,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { CourseDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { ConnectConfirmDialog } from '../dialogs/ConnectConfirmDialog'
import { NotEnoughCoinsDialog } from '../dialogs/NotEnoughCoinsDialog'
import { ReportDialog } from '../dialogs/ReportDialog'
import { ReviewDialog } from '../dialogs/ReviewDialog'
import { ActionGrid, CardAction, DetailRow, FbCard, StatText } from '../shared/bits'
import { RichText } from '../shared/RichText'
import { SafeImage } from '../shared/SafeImage'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '../shared/UserAvatar'
import { timeAgo } from '../shared/format'

type CourseWithRating = CourseDTO & { teacherAvgRating?: number }

export function CourseCard({ course, onChanged }: { course: CourseDTO; onChanged?: () => void }) {
  const me = useAppStore((s) => s.me)!
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)

  const [liked, setLiked] = useState(course.myLike)
  const [likeCount, setLikeCount] = useState(course.likeCount)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [questionOpen, setQuestionOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [questionLoading, setQuestionLoading] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [notEnough, setNotEnough] = useState<{ needed: number } | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  const teacherRating = (course as CourseWithRating).teacherAvgRating
  const alreadyJoined = !!course.myConnectionId
  const isMine = course.teacherId === me.id

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      const d = await api.like('COURSE', course.id)
      setLiked(d.liked)
      setLikeCount(d.likeCount)
    } catch (e) {
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error('Could not update like', { description: errorMessage(e) })
    }
  }

  async function enroll(withQuestion?: string) {
    setJoining(true)
    try {
      const { connection } = await api.createConnection({ courseId: course.id })
      if (withQuestion && withQuestion.trim()) {
        try {
          await api.sendMessage(connection.id, { content: withQuestion.trim() })
        } catch {
          // non-blocking — chat is open anyway
        }
      }
      void refreshMe()
      setJoinOpen(false)
      setQuestionOpen(false)
      setQuestion('')
      toast.success(withQuestion ? 'Question sent!' : 'Join request sent!', {
        description: `Chat with ${course.teacher.name} is open.`,
      })
      go('chats', { connectionId: connection.id })
      onChanged?.()
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setJoinOpen(false)
        setQuestionOpen(false)
        setNotEnough({ needed: course.connectionCost })
      } else {
        toast.error('Could not join course', { description: errorMessage(e) })
      }
    } finally {
      setJoining(false)
    }
  }

  return (
    <FbCard>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <UserAvatar
          src={course.teacher.avatar}
          name={course.teacher.name}
          onClick={() => go('profile', { userId: course.teacherId })}
        />
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => go('profile', { userId: course.teacherId })}
        >
          <p className="font-bold leading-tight hover:underline">{course.teacher.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {course.teacher.city ?? 'Online'} · {timeAgo(course.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof teacherRating === 'number' ? (
            <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">
              ★ {teacherRating.toFixed(1)}
            </span>
          ) : null}
          {alreadyJoined ? (
            <span className="flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-[#1877F2] dark:text-blue-400">
              <CheckCircle2 className="size-3" />
              Request sent
            </span>
          ) : (
            <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
              Hire Teacher
            </span>
          )}
          {!isMine ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Report course"
                  title="Report course"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <MoreVertical className="size-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setReportOpen(true)}
                  className="gap-2 text-red-600 focus:text-red-600"
                >
                  <Flag className="size-4" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-3 px-4 pb-4">
        <h3 className="text-[17px] font-bold leading-snug">{course.title}</h3>
        <RichText text={course.description} keywords={[course.subject, course.language]} clamp={3} />
        <SafeImage src={course.cover} alt={course.title} className="aspect-[4/3] w-full rounded-lg object-cover" />
        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3">
          <DetailRow icon={Languages} label="Language" value={course.language} />
          <DetailRow icon={BookOpen} label="Subject" value={course.subject} />
          <DetailRow icon={Presentation} label="Duration for course" value={course.duration} />
          <DetailRow icon={Clock} label="Timing" value={course.timing} />
          <DetailRow icon={CalendarClock} label="Class duration" value={course.classDuration} />
          <DetailRow icon={Repeat2} label="Classes Per Week" value={course.classesPerWeek} />
          <DetailRow icon={MonitorPlay} label="Course Format" value={course.format} />
          <DetailRow icon={Banknote} label="Fee" value={`$${course.fee}`} bold />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-3 pb-2 pt-1.5">
        <StatText>{likeCount} Likes</StatText>
        <ActionGrid count={4}>
          <CardAction icon={ThumbsUp} label="Like" active={liked} onClick={toggleLike} />
          <CardAction icon={MessageSquareText} label="Review" onClick={() => setReviewOpen(true)} />
          <CardAction icon={HelpCircle} label="Question" disabled={alreadyJoined} onClick={() => setQuestionOpen(true)} />
          {alreadyJoined ? (
            <CardAction
              icon={MessagesSquare}
              label="Open Chat"
              primary
              onClick={() => go('chats', { connectionId: course.myConnectionId! })}
            />
          ) : (
            <CardAction icon={Presentation} label="Join Request" primary onClick={() => setJoinOpen(true)} />
          )}
        </ActionGrid>
      </div>

      {/* Dialogs */}
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        target={{ id: course.teacherId, name: course.teacher.name, avatar: course.teacher.avatar }}
        onSubmitted={onChanged}
      />
      <ConfirmDialog
        open={questionOpen}
        onOpenChange={setQuestionOpen}
        title={`Ask ${course.teacher.name} a question`}
        message={`This opens a private chat with ${course.teacher.name} — it costs ${course.connectionCost} coins.`}
        confirmLabel={`Send Question · ${course.connectionCost} coins`}
        loading={questionLoading || joining}
        onConfirm={() => enroll(question)}
      >
        <Textarea
          placeholder="e.g. Is there a demo class? What is the schedule?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </ConfirmDialog>
      <ConnectConfirmDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        title="Join this course?"
        message={`Joining "${course.title}" costs ${course.connectionCost} coins — continue?`}
        cost={course.connectionCost}
        balance={me.coins}
        confirmLabel="Join Course"
        loading={joining}
        onConfirm={() => enroll()}
      />
      <NotEnoughCoinsDialog
        open={notEnough !== null}
        onOpenChange={(o) => !o && setNotEnough(null)}
        needed={notEnough?.needed ?? course.connectionCost}
        balance={me.coins}
      />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{
          type: 'COURSE',
          targetId: course.id,
          targetUserId: course.teacherId,
          label: course.title,
        }}
      />
    </FbCard>
  )
}
