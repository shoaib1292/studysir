import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

/**
 * Lightweight password hashing (Node crypto scrypt — no native deps).
 * Format: salt:hex  (salt is 16 random bytes, key is 64 bytes)
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(plain, salt, 64).toString('hex')
  return `${salt}:${key}`
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(':')) return false
  const [salt, key] = stored.split(':')
  try {
    const derived = scryptSync(plain, salt, 64)
    const expected = Buffer.from(key, 'hex')
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}
