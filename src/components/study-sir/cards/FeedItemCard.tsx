'use client'

import type { FeedItem } from '@/lib/types'
import { CourseCard } from './CourseCard'
import { GoodCard } from './GoodCard'
import { TeacherCard } from './TeacherCard'
import { TuitionCard } from './TuitionCard'

/** Renders any feed item kind with the appropriate card. */
export function FeedItemCard({
  item,
  onChanged,
  showOwnerActions = false,
}: {
  item: FeedItem
  onChanged?: () => void
  showOwnerActions?: boolean
}) {
  switch (item.kind) {
    case 'tuition':
      return <TuitionCard tuition={item.tuition} onChanged={onChanged} showOwnerActions={showOwnerActions} />
    case 'course':
      return <CourseCard course={item.course} onChanged={onChanged} />
    case 'good':
      return <GoodCard good={item.good} onChanged={onChanged} />
    case 'teacher':
      return <TeacherCard teacher={item.teacher} onChanged={onChanged} />
    default:
      return null
  }
}
