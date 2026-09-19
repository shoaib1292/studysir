'use client'

import { useState } from 'react'
import { LegalDialog, type LegalPageKey } from '../views/LegalPages'

const FOOTER_LINKS: { key: LegalPageKey; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'help', label: 'Help' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'terms', label: 'Terms' },
  { key: 'contact', label: 'Contact' },
]

export function Footer() {
  const [legalPage, setLegalPage] = useState<LegalPageKey | null>(null)

  return (
    <footer className="mt-auto border-t bg-card py-4">
      <div className="flex flex-col items-center gap-1.5 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-logo">StudySir</span> © 2025 · Connecting Students &amp; Teachers
        </p>
        <nav aria-label="Legal and information pages" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLegalPage(link.key)}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-[#1877F2] hover:underline"
              >
                {link.label}
              </button>
              {i < FOOTER_LINKS.length - 1 ? (
                <span className="text-muted-foreground/40" aria-hidden="true">
                  ·
                </span>
              ) : null}
            </span>
          ))}
        </nav>
      </div>

      <LegalDialog
        open={!!legalPage}
        onOpenChange={(o) => !o && setLegalPage(null)}
        page={legalPage ?? 'privacy'}
      />
    </footer>
  )
}
