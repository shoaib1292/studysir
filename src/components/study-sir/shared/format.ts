import { format } from 'date-fns'

export function firstName(name: string): string {
  return name.split(' ')[0] ?? name
}

export function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

/** Compact relative time like "2h", "3d", "now" (falls back to "d MMM" for older). */
export function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return format(d, 'd MMM')
}

export function clockTime(iso: string): string {
  return format(new Date(iso), 'h:mm a')
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

/** "Today" / "Yesterday" / "d MMM yyyy" for chat date chips. */
export function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (sameDay(d, new Date())) return 'Today'
  if (sameDay(d, new Date(Date.now() - 86400000))) return 'Yesterday'
  return format(d, 'd MMM yyyy')
}

/** "last seen today at 2:46 AM" style label for chat headers. */
export function lastSeenLabel(iso: string | null | undefined): string {
  if (!iso) return 'offline'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'offline'
  if (sameDay(d, new Date())) return `last seen today at ${format(d, 'h:mm a')}`
  if (sameDay(d, new Date(Date.now() - 86400000))) return `last seen yesterday at ${format(d, 'h:mm a')}`
  return `last seen ${format(d, 'd MMM yyyy')}`
}

export function fullDate(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy')
}
