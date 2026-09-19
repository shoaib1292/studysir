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
  Play,
  Presentation,
  Repeat2,
  MessageSquareText,
  MonitorPlay,
  Share2,
  ThumbsUp,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api, errorMessage } from '@/lib/api'
import type { CourseDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'
import { ConnectConfirmDialog } from '../dialogs/ConnectConfirmDialog'
import { ReportDialog } from '../dialogs/ReportDialog'
import { ReviewDialog } from '../dialogs/ReviewDialog'
import { ShareDialog, type ShareContent } from '../dialogs/ShareDialog'
import { ActionGrid, CardAction, DetailRow, FbCard, StatText } from '../shared/bits'
import { RichText } from '../shared/RichText'
import { SafeImage } from '../shared/SafeImage'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '../shared/UserAvatar'
import { timeAgo } from '../shared/format'
import { useRequireAuth } from '../auth/useRequireAuth'

type CourseWithRating = CourseDTO & { teacherAvgRating?: number }

/**
 * Lazy YouTube embed. Shows the video thumbnail with a big play button; the
 * actual iframe only loads when the user clicks (keeps the feed fast — we never
 * embed dozens of iframes for cards off-screen).
 */
function VideoFacade({ videoId, label }: { videoId: string; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title="Course video"
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="Play course video"
      className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-black"
    >
      <SafeImage src={thumb} alt="Course video thumbnail" className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
      <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/20">
        <span className="grid size-14 place-items-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110">
          <Play className="size-6 fill-white text-white" />
        </span>
      </span>
      {label ? (
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
          {label}
        </span>
      ) : null}
    </button>
  )
}

export function CourseCard({
  course,
  onChanged,
  embedded = false,
}: {
  course: CourseDTO
  onChanged?: () => void
  /** rendered inside a SharedPostCard wrapper — the Share action is hidden */
  embedded?: boolean
}) {
  const me = useAppStore((s) => s.me)
  const go = useAppStore((s) => s.go)
  const refreshMe = useAppStore((s) => s.refreshMe)
  const { fmt } = useMoney(me ?? null)
  const { requireAuth, LoginPromptDialog } = useRequireAuth()

  const [liked, setLiked] = useState(course.myLike)
  const [likeCount, setLikeCount] = useState(course.likeCount)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [questionOpen, setQuestionOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [questionLoading, setQuestionLoading] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const shareContent: ShareContent = {
    targetType: 'COURSE',
    targetId: course.id,
    authorName: course.teacher.name,
    authorAvatar: course.teacher.avatar,
    authorRole: course.teacher.role,
    emoji: '🎓',
    title: course.title,
    byline: `— course by ${course.teacher.name}`,
    details: [
      ['Subject', course.subject ?? ''],
      ['Language', course.language ?? ''],
      ['Duration', course.duration ?? ''],
      ['Timing', course.timing ?? ''],
      ['Format', course.format ?? ''],
    ],
    description: course.description,
    price: `💰 Course fee: ${fmt(course.fee)}`,
    image: course.cover,
  }

  const teacherRating = (course as CourseWithRating).teacherAvgRating
  const alreadyJoined = !!course.myConnectionId
  const isMine = me ? course.teacherId === me.id : false

  // Video + fee rules:
  //   • FULL free course with video → anyone can watch directly (no join request)
  //   • INTRO video on a paid course → watch the teaser, then Join Request
  //   • no video → original flow (Join Request / Open Chat)
  const hasVideo = !!course.videoId && !!course.videoUrl
  const isFullFreeVideo = hasVideo && course.videoKind === 'FULL' && course.fee === 0
  const isIntroVideo = hasVideo && course.videoKind === 'INTRO'
  const videoLabel = isFullFreeVideo ? 'Full free course' : isIntroVideo ? 'Intro video' : undefined

  // Auth-protected action handlers
  const handleLike = () => requireAuth(toggleLike)
  const handleReview = () => requireAuth(() => setReviewOpen(true))
  const handleShare = () => requireAuth(() => setShareOpen(true))
  const handleQuestion = () => requireAuth(() => setQuestionOpen(true))
  const handleJoin = () => requireAuth(() => setJoinOpen(true))
  const handleReport = () => requireAuth(() => setReportOpen(true))

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
          // PENDING chat: teacher sees the question after accepting
        }
      }
      void refreshMe()
      setJoinOpen(false)
      setQuestionOpen(false)
      setQuestion('')
      toast.success(withQuestion ? 'Question sent — waiting for teacher' : 'Join request sent!', {
        description: `FREE for you — ${course.teacher.name} will accept to unlock the chat.`,
      })
      go('chats', { connectionId: connection.id })
      onChanged?.()
    } catch (e) {
      toast.error('Could not join course', { description: errorMessage(e) })
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
          {isFullFreeVideo ? (
            <span className="flex items-center gap-1 rounded bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
              <Play className="size-3" />
              Free Course
            </span>
          ) : alreadyJoined ? (
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
                  onClick={handleReport}
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
        {/* When the course has a YouTube video, the video player REPLACES the
            static cover image — the thumbnail comes from YouTube automatically. */}
        {hasVideo && course.videoId ? (
          <VideoFacade videoId={course.videoId} label={videoLabel} />
        ) : (
          <SafeImage src={course.cover} alt={course.title} className="aspect-[4/3] w-full rounded-lg object-cover" />
        )}
        <div className="space-y-1.5 rounded-lg bg-muted/60 p-3">
          <DetailRow icon={Languages} label="Language" value={course.language} />
          <DetailRow icon={BookOpen} label="Subject" value={course.subject} />
          <DetailRow icon={Presentation} label="Duration for course" value={course.duration} />
          <DetailRow icon={Clock} label="Timing" value={course.timing} />
          <DetailRow icon={CalendarClock} label="Class duration" value={course.classDuration} />
          <DetailRow icon={Repeat2} label="Classes Per Week" value={course.classesPerWeek} />
          <DetailRow icon={MonitorPlay} label="Course Format" value={course.format} />
          <DetailRow icon={Banknote} label="Fee" value={isFullFreeVideo ? 'Free' : fmt(course.fee)} bold />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-3 pb-2 pt-1.5">
        <StatText>{likeCount} Likes</StatText>
        <ActionGrid count={embedded ? 4 : 5}>
          <CardAction icon={ThumbsUp} label="Like" active={liked} onClick={handleLike} />
          <CardAction icon={MessageSquareText} label="Review" onClick={handleReview} />
          {!embedded ? <CardAction icon={Share2} label="Share" onClick={handleShare} /> : null}
          {!isFullFreeVideo ? (
            <CardAction icon={HelpCircle} label="Question" disabled={alreadyJoined} onClick={handleQuestion} />
          ) : null}
          {isFullFreeVideo ? (
            // Free full-course video: students watch directly — no join request.
            // The video player is already above; this just confirms access is open.
            <CardAction icon={Play} label="Watch Free" primary onClick={() => toast.info('The video is right above — just hit play!')} />
          ) : alreadyJoined ? (
            <CardAction icon={MessagesSquare} label="Open Chat" primary onClick={handleJoin} />
          ) : (
            <CardAction icon={Presentation} label="Join Request" primary onClick={handleJoin} />
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
        message={`FREE for you — your question is sent with the join request. ${course.teacher.name} accepts it to unlock the private chat.`}
        confirmLabel="Send Request — Free"
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
        title="Request to join this course?"
        message={`Joining "${course.title}" is FREE for you. ${course.teacher.name} will accept the request to unlock the chat (accepting costs the teacher coins).`}
        cost={0}
        balance={me?.coins ?? 0}
        confirmLabel="Send Join Request — Free"
        loading={joining}
        onConfirm={() => enroll()}
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
      {!embedded ? (
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} content={shareContent} onShared={onChanged} />
      ) : null}
      {LoginPromptDialog}
    </FbCard>
  )
}
