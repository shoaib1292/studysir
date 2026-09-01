import type { ConnectionStatus } from '@/lib/types'

/** Cost of a direct teacher contact / hire when no tuition post is involved. */
export const DIRECT_CONTACT_COST = 10

export const AVATAR_OPTIONS = [
  '/images/avatar-warren.png',
  '/images/avatar-student.png',
  '/images/avatar-parent.png',
  '/images/avatar-mukesh.png',
  '/images/avatar-adani.png',
  '/images/avatar-elon.png',
  '/images/avatar-alina.png',
  '/images/avatar-noman.png',
]

export const COVER_OPTIONS = ['/images/cover-meeting.png', '/images/cover-classroom.png']

export const GOOD_IMAGE_OPTIONS = [
  '/images/book-finance.png',
  '/images/course-english.png',
  '/images/cover-classroom.png',
]

/**
 * Client-side mirror of the server's computeCoinCost (kept in sync manually —
 * src/lib/coins.ts imports prisma so it can't be pulled into the client bundle).
 */
export function clientCoinCost(feeMin: number, feeMax: number, mode: string): number {
  const safeMin = Number.isFinite(feeMin) ? Math.max(0, feeMin) : 0
  const safeMax = Number.isFinite(feeMax) ? Math.max(0, feeMax) : 0
  const avg = (safeMin + safeMax) / 2
  let cost = 5 + Math.round(avg / 10)
  if (mode === 'HOME') cost += 5
  if (mode === 'CENTER') cost += 2
  return Math.min(50, Math.max(5, cost))
}

export const REFUND_RULE_TEXT =
  'Coins return only if the student/parent rejects before any chat starts, or never replies within 10 days.'

export const ROLE_CHIP: Record<string, string> = {
  STUDENT: 'bg-blue-100 text-blue-700',
  PARENT: 'bg-purple-100 text-purple-700',
  TEACHER: 'bg-green-100 text-green-700',
}

export const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Student',
  PARENT: 'Parent',
  TEACHER: 'Teacher',
}

export const CONNECTION_CHIP: Record<ConnectionStatus, { label: string; className: string }> = {
  PENDING: { label: 'New request', className: 'bg-gray-200 text-gray-700' },
  ACTIVE: { label: 'Chatting', className: 'bg-blue-100 text-[#1877F2]' },
  HIRED: { label: 'Hired', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  EXPIRED: { label: 'Expired', className: 'bg-amber-100 text-amber-700' },
}

export const CONNECTION_DOT: Record<ConnectionStatus, string> = {
  PENDING: 'bg-amber-400',
  ACTIVE: 'bg-green-500',
  HIRED: 'bg-[#1877F2]',
  REJECTED: 'bg-red-500',
  EXPIRED: 'bg-amber-400',
}

export const TUITION_STATUS: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-green-100 text-green-700' },
  HIRED: { label: 'Hired', className: 'bg-blue-100 text-[#1877F2]' },
  CLOSED: { label: 'Closed', className: 'bg-gray-200 text-gray-600' },
}
