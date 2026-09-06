'use client'

import type { FeedItem } from '@/lib/types'
import { CourseCard } from './CourseCard'
import { GoodCard } from './GoodCard'
import { SharedPostCard } from './SharedPostCard'
import { TeacherCard } from './TeacherCard'
import { TuitionCard } from './TuitionCard'

/**
 * Renders any feed item kind with the appropriate card.
 * `embedded` renders inside a SharedPostCard wrapper: the Share action is
 * hidden on the inner card and shares can never nest.
 */
export function FeedItemCard({
  item,
  onChanged,
  showOwnerActions = false,
  embedded = false,
}: {
  item: FeedItem
  onChanged?: () => void
  showOwnerActions?: boolean
  embedded?: boolean
}) {
  switch (item.kind) {
    case 'tuition':
      return (
        <TuitionCard
          tuition={item.tuition}
          onChanged={onChanged}
          showOwnerActions={showOwnerActions}
          embedded={embedded}
        />
      )
    case 'course':
      return <CourseCard course={item.course} onChanged={onChanged} embedded={embedded} />
    case 'good':
      return <GoodCard good={item.good} onChanged={onChanged} embedded={embedded} />
    case 'teacher':
      return <TeacherCard teacher={item.teacher} onChanged={onChanged} embedded={embedded} />
    case 'shared':
      // a share never embeds another share (backend contract) — render only at top level
      return embedded ? null : <SharedPostCard shared={item.shared} onChanged={onChanged} />
    default:
      return null
  }
}
