'use client'

import { useCallback, useEffect, useState } from 'react'
import { Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { CourseDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { PostCourseDialog } from '../dialogs/PostCourseDialog'
import { CourseCard } from '../cards/CourseCard'
import { CardSkeleton } from '../shared/bits'
import { EmptyState } from '../shared/EmptyState'

export function CoursesView() {
  const me = useAppStore((s) => s.me)!
  const nonce = useAppStore((s) => s.nonce)

  const [courses, setCourses] = useState<CourseDTO[] | null>(null)
  const [postOpen, setPostOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.getFeed('course')
      setCourses(d.items.filter((i) => i.kind === 'course').map((i) => (i.kind === 'course' ? i.course : null)).filter(Boolean) as CourseDTO[])
    } catch {
      setCourses([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, nonce])

  const isTeacher = me.role === 'TEACHER'

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Courses</h1>
        {isTeacher ? (
          <Button onClick={() => setPostOpen(true)}>
            <Presentation className="size-4" />
            Post Course
          </Button>
        ) : null}
      </div>

      {courses === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={Presentation}
          title="No courses yet"
          hint={isTeacher ? 'Publish your first course — students can join with coins.' : 'Teachers will publish structured courses here soon.'}
          action={
            isTeacher ? (
              <Button size="sm" onClick={() => setPostOpen(true)}>
                Post Course
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} onChanged={load} />
          ))}
        </div>
      )}

      <PostCourseDialog open={postOpen} onOpenChange={setPostOpen} onPosted={load} />
    </div>
  )
}
