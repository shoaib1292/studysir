'use client'

import { useEffect, useMemo, useState } from 'react'
import { Radio, UserRoundCheck, UsersRound } from 'lucide-react'
import { api } from '@/lib/api'
import type { TeacherCardDTO, UserDTO } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { Stars } from '../shared/Stars'
import { UserAvatar } from '../shared/UserAvatar'

/**
 * Facebook-style right rail for the feed (xl+ only):
 *  - Suggested Teachers: top-rated profiles
 *  - Contacts: who's online right now (live presence)
 */
export function FeedRail() {
  const go = useAppStore((s) => s.go)
  const onlineIds = useAppStore((s) => s.onlineIds)
  const me = useAppStore((s) => s.me)!

  const [teachers, setTeachers] = useState<TeacherCardDTO[] | null>(null)
  const [users, setUsers] = useState<UserDTO[] | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getFeed('teacher')
      .then((d) => {
        if (cancelled) return
        const list = d.items
          .filter((i) => i.kind === 'teacher')
          .map((i) => (i.kind === 'teacher' ? i.teacher : null))
          .filter((t): t is TeacherCardDTO => t !== null)
        setTeachers(list)
      })
      .catch(() => {
        if (!cancelled) setTeachers([])
      })
    api
      .getUsers()
      .then((d) => {
        if (!cancelled) setUsers(d.users)
      })
      .catch(() => {
        if (!cancelled) setUsers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const suggested = useMemo(() => {
    if (!teachers) return null
    return [...teachers]
      .filter((t) => t.id !== me.id)
      .sort((a, b) => b.avgRating - a.avgRating || b.hireCount - a.hireCount || b.likeCount - a.likeCount)
      .slice(0, 3)
  }, [teachers, me.id])

  const onlineContacts = useMemo(() => {
    if (!users) return null
    return users
      .filter((u) => u.id !== me.id && u.role === 'TEACHER' && onlineIds.includes(u.id))
      .slice(0, 8)
  }, [users, onlineIds, me.id])

  return (
    <aside aria-label="Feed suggestions" className="hidden w-[290px] shrink-0 xl:block">
      <div className="sticky top-[112px] space-y-3">
        {/* Suggested Teachers */}
        <section className="card-shadow rounded-xl border bg-card p-3">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-bold text-muted-foreground">
            <UserRoundCheck className="size-4" />
            Suggested Teachers
          </h2>
          {suggested === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : suggested.length === 0 ? (
            <p className="px-1 pb-1 text-xs text-muted-foreground">No teachers to suggest yet.</p>
          ) : (
            <div className="space-y-1">
              {suggested.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go('profile', { userId: t.id })}
                  className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                >
                  <UserAvatar src={t.avatar} name={t.name} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold hover:underline">{t.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {t.city ?? 'Online'}
                      {t.feeMin ? ` · from $${t.feeMin}` : ''}
                    </span>
                  </span>
                  <Stars value={t.avgRating} size="size-3" showValue />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Contacts — live presence */}
        <section className="card-shadow rounded-xl border bg-card p-3">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-bold text-muted-foreground">
            <UsersRound className="size-4" />
            Contacts
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
              <Radio className="size-3 animate-pulse" />
              Live
            </span>
          </h2>
          {onlineContacts === null ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : onlineContacts.length === 0 ? (
            <p className="px-1 pb-1 text-xs text-muted-foreground">
              No teachers online right now — check back soon.
            </p>
          ) : (
            <div className="space-y-0.5">
              {onlineContacts.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => go('profile', { userId: u.id })}
                  className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="relative shrink-0">
                    <UserAvatar src={u.avatar} name={u.name} className="size-9" />
                    <span className="absolute -right-0.5 -top-0.5 size-3 animate-pulse rounded-full border-2 border-card bg-green-500" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold hover:underline">{u.name}</span>
                    <span className="block text-[11px] text-green-600 dark:text-green-400">Active now</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
          StudySir © {new Date().getFullYear()} — tuition marketplace demo. Hire teachers with coins, chat
          instantly, buy digital notes.
        </p>
      </div>
    </aside>
  )
}
