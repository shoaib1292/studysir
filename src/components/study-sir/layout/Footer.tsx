'use client'

import { toast } from 'sonner'

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card py-4">
      <div className="flex flex-col items-center gap-1.5 px-4 text-center">
        <p className="text-xs text-muted-foreground">StudySir © 2025 · Connecting Students &amp; Teachers</p>
        <div className="flex items-center gap-4">
          {['About', 'Help', 'Privacy'].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => toast.info(`${label}`, { description: 'This is a demo page — nothing to see here yet.' })}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-[#1877F2] hover:underline"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  )
}
