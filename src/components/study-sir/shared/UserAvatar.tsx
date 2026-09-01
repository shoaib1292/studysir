'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { initials } from './format'

export function UserAvatar({
  src,
  name,
  className,
  dot,
  onClick,
}: {
  src?: string | null
  name: string
  className?: string
  /** Tailwind bg class for the status dot, e.g. "bg-green-500". Omit for no dot. */
  dot?: string | null
  onClick?: () => void
}) {
  return (
    <div
      className={cn('relative shrink-0', onClick && 'cursor-pointer transition-opacity hover:opacity-90')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <Avatar className={cn('size-10', className)}>
        {src ? <AvatarImage src={src} alt={name} /> : null}
        <AvatarFallback className="bg-[#1877F2]/10 text-xs font-bold text-[#1877F2]">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {dot ? (
        <span className={cn('absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white', dot)} />
      ) : null}
    </div>
  )
}
