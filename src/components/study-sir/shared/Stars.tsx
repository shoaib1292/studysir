'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Stars({
  value,
  size = 'size-3.5',
  showValue = false,
  className,
}: {
  value: number
  size?: string
  showValue?: boolean
  className?: string
}) {
  const rounded = Math.round(value)
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(size, i <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-300')}
        />
      ))}
      {showValue ? (
        <span className="ml-1 text-xs font-bold text-foreground">{value.toFixed(1)}</span>
      ) : null}
    </span>
  )
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110 focus-visible:outline-none"
        >
          <Star className={cn('size-7', i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  )
}
