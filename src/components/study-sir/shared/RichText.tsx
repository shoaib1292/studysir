'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

function splitKeywords(list: Array<string | null | undefined>): string[] {
  const out: string[] = []
  for (const item of list) {
    if (!item) continue
    for (const part of item.split(',')) {
      const k = part.trim()
      if (k.length > 1) out.push(k)
    }
  }
  return out
}

/**
 * Text block with subject/location keyword highlighting (blue) and a
 * "See More"/"See Less" toggle when clamped.
 */
export function RichText({
  text,
  keywords,
  clamp = 4,
  className,
  toggleClassName,
}: {
  text: string
  keywords?: Array<string | null | undefined>
  clamp?: number
  className?: string
  toggleClassName?: string
}) {
  const [expanded, setExpanded] = useState(false)

  const parts = useMemo(() => {
    const kws = splitKeywords(keywords ?? [])
    if (!kws.length || !text) return [{ t: text, hit: false }]
    const set = new Set(kws.map((k) => k.toLowerCase()))
    const pattern = kws.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const chunks = text.split(new RegExp(`(${pattern})`, 'gi'))
    return chunks
      .filter((c) => c !== '')
      .map((chunk) => ({ t: chunk, hit: set.has(chunk.toLowerCase()) }))
  }, [text, keywords])

  // Heuristic for "does the text overflow at `clamp` lines?"
  const likelyLong = text.length > clamp * 90
  const clampStyle: CSSProperties | undefined =
    !expanded && likelyLong
      ? { display: '-webkit-box', WebkitLineClamp: clamp, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
      : undefined

  return (
    <div className="min-w-0">
      <p className={cn('whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90', className)} style={clampStyle}>
        {parts.map((p, i) =>
          p.hit ? (
            <span key={i} className="font-semibold text-[#1877F2]">
              {p.t}
            </span>
          ) : (
            <span key={i}>{p.t}</span>
          )
        )}
      </p>
      {likelyLong ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn('mt-0.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground hover:underline', toggleClassName)}
        >
          {expanded ? 'See Less' : 'See More'}
        </button>
      ) : null}
    </div>
  )
}
