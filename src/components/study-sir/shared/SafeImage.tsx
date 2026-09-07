'use client'

import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Local <img> with graceful fallback when the asset is missing (image assets
 * are generated in the background, so paths may 404 during development).
 */
export function SafeImage({
  src,
  alt,
  className,
  iconClassName,
}: {
  src?: string | null
  alt: string
  className?: string
  iconClassName?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc !== null && failedSrc === src

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-[#1877F2]/25 via-[#1877F2]/10 to-[#0A56C4]/25',
          className
        )}
      >
        <GraduationCap className={cn('size-10 text-[#1877F2]/40', iconClassName)} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(src)}
      draggable={false}
    />
  )
}
