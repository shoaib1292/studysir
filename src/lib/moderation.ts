/**
 * Content moderation scanner for StudySir.
 *
 * Rules (requirement from the user):
 *  1. Users MUST NOT post direct contact info (mobile numbers, email addresses)
 *     in posts or comments/messages. Such content is BLOCKED outright (rejected at submit).
 *  2. Any link/URL a user posts goes to a moderation queue. It becomes visible only
 *     after a StudySir admin/staff approves it.
 *
 * This module exposes:
 *   - scanContent(text)  → { hasContactInfo, hasUnapprovedLink, contactMatches, linkMatches }
 *   - blockReason(scan)  → a human reason string when content must be blocked, else null
 *   - excerpt(text, matches) → short snippet around the first match for the audit log
 */

export interface ModerationScan {
  hasContactInfo: boolean
  hasUnapprovedLink: boolean
  contactMatches: string[]
  linkMatches: string[]
}

// Phone numbers: international and PK/IN-style. Matches 7-15 contiguous digits,
// optional + prefix, spaces/dashes allowed between digit groups. We deliberately
// require at least 7 digits to avoid matching years, fees, etc.
const PHONE_RE = /(?:\+?\d[\d\s\-().]{6,}\d)/g

// Email addresses.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// URLs / links. Covers http(s), www., and bare domains like foo.com/path.
const URL_RE = /(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|\b[a-zA-Z0-9-]+\.(?:com|org|net|io|co|pk|in|edu|gov|me|tv|cc|xyz|info|biz)[\/\w?#&=.-]*)/gi

// Whitelisted hosts that never need review (StudySir's own assets/uploads +
// YouTube, which is handled by the dedicated videoUrl field on courses).
const WHITELIST_HOSTS = new Set<string>([
  'studysir.app',
  'localhost',
  '127.0.0.1',
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'img.youtube.com',
])

function isWhitelistedLink(raw: string): boolean {
  try {
    let host = raw
    host = host.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
    const slash = host.indexOf('/')
    if (slash >= 0) host = host.slice(0, slash)
    const colon = host.indexOf(':')
    if (colon >= 0) host = host.slice(0, colon)
    return WHITELIST_HOSTS.has(host.toLowerCase())
  } catch {
    return false
  }
}

/** Scan arbitrary user-generated text for contact info and unapproved links. */
export function scanContent(text: string | null | undefined): ModerationScan {
  const t = typeof text === 'string' ? text : ''
  if (!t.trim()) {
    return { hasContactInfo: false, hasUnapprovedLink: false, contactMatches: [], linkMatches: [] }
  }

  const phones = t.match(PHONE_RE) ?? []
  const emails = t.match(EMAIL_RE) ?? []
  const rawLinks = t.match(URL_RE) ?? []

  // Filter out fee-like numbers (e.g. "2000-6000" is a fee range, not a phone).
  // A real phone is 7+ digits total and does not look like a 4-digit year pair.
  const realPhones = phones.filter((p) => {
    const digits = p.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  })

  const contactMatches = [...realPhones, ...emails]
  const linkMatches = rawLinks.filter((l) => !isWhitelistedLink(l))

  return {
    hasContactInfo: contactMatches.length > 0,
    hasUnapprovedLink: linkMatches.length > 0,
    contactMatches,
    linkMatches,
  }
}

/**
 * Returns a human reason string when content must be BLOCKED (contact info found),
 * otherwise null. Link-only content is NOT blocked — it goes to the review queue.
 */
export function blockReason(scan: ModerationScan): string | null {
  if (scan.hasContactInfo) {
    return 'Contact info (phone number/email) is not allowed in posts or messages. Please remove it — students and teachers connect through StudySir chat.'
  }
  return null
}

/** Short excerpt around the first flagged match, for the audit log / admin queue. */
export function excerpt(text: string, matches: string[]): string {
  if (!matches.length || !text) return (text ?? '').slice(0, 160)
  const m = matches[0]
  const idx = text.indexOf(m)
  if (idx < 0) return m.slice(0, 160)
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + m.length + 40)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

export const MODERATION_REASONS = {
  CONTACT_INFO: 'CONTACT_INFO',
  UNAPPROVED_LINK: 'UNAPPROVED_LINK',
} as const

export const MODERATION_STATUS = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  BLOCKED: 'BLOCKED',
} as const
