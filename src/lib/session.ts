import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'ss_uid'

export async function setSessionUser(userId: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, userId, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function clearSessionUser() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

export async function getSessionUser() {
  const id = await getSessionUserId()
  if (!id) return null
  try {
    return await db.user.findUnique({ where: { id } })
  } catch {
    return null
  }
}

export async function requireSessionUser() {
  const user = await getSessionUser()
  if (!user) throw new HttpError(401, 'Not logged in')
  return user
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}
