'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, errorMessage } from '@/lib/api'
import type { AdminUserDTO, Role } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { ROLE_CHIP, ROLE_LABEL } from '../../shared/constants'
import { UserAvatar } from '../../shared/UserAvatar'
import { EmptyState } from '../../shared/EmptyState'

type RoleFilter = 'ALL' | Role
type StatusFilter = 'ALL' | 'ACTIVE' | 'BANNED'

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
        active ? 'bg-[#1877F2] text-white' : 'bg-muted text-muted-foreground hover:bg-secondary'
      )}
    >
      {children}
    </button>
  )
}

function RoleChips({ user }: { user: AdminUserDTO }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', ROLE_CHIP[user.role] ?? 'bg-muted text-muted-foreground')}>
        {ROLE_LABEL[user.role] ?? user.role}
      </span>
      {user.isAdmin ? (
        <span className="inline-flex items-center gap-0.5 rounded bg-[#1877F2]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#1877F2] dark:text-blue-400">
          <ShieldCheck className="size-3" />
          ADMIN
        </span>
      ) : null}
      {user.status === 'BANNED' ? (
        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
          BANNED
        </span>
      ) : null}
    </span>
  )
}

/** Ban / Unban with a small confirm popover (same visual language as the report actions). */
function BanCell({ user, onChanged }: { user: AdminUserDTO; onChanged: () => void }) {
  const banned = user.status === 'BANNED'
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  async function setStatus() {
    setBusy(true)
    try {
      await api.adminSetUserStatus(user.id, banned ? 'ACTIVE' : 'BANNED')
      toast.success(banned ? `${user.name} reinstated` : `${user.name} suspended`, {
        description: banned ? 'They can log in and use StudySir again.' : 'They can no longer log in or act on the platform.',
      })
      setOpen(false)
      onChanged()
    } catch (e) {
      toast.error('Could not update user', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className={cn(
            banned
              ? 'text-green-700 hover:bg-green-500/10 dark:text-green-400'
              : 'text-red-600 hover:bg-red-500/10 dark:text-red-400'
          )}
        >
          <Ban className="mr-1 size-3.5" />
          {banned ? 'Unban' : 'Ban'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 space-y-2.5">
        <p className="text-sm font-semibold">
          {banned ? `Unban ${user.name}?` : `Ban ${user.name}?`}
        </p>
        <p className="text-xs text-muted-foreground">
          {banned
            ? 'They will be able to log in and use StudySir again.'
            : 'They will no longer be able to log in or act on the platform.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void setStatus()}
            className={cn(
              !banned && 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
            )}
          >
            {banned ? 'Unban' : 'Ban'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function UserRowDesktop({ user, onChanged, canModerate }: { user: AdminUserDTO; onChanged: () => void; canModerate: boolean }) {
  const go = useAppStore((s) => s.go)
  return (
    <TableRow className={cn(user.status === 'BANNED' && 'bg-red-500/5')}>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <UserAvatar
            src={user.avatar}
            name={user.name}
            className="size-9"
            onClick={() => go('profile', { userId: user.id })}
          />
          <div className="min-w-0">
            <button
              type="button"
              className="block max-w-[180px] truncate text-sm font-bold hover:underline"
              onClick={() => go('profile', { userId: user.id })}
            >
              {user.name}
            </button>
            <p className="max-w-[180px] truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleChips user={user} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{user.city ?? '—'}</TableCell>
      <TableCell className="text-sm font-semibold tabular-nums">{user.coins.toLocaleString()}</TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {user.hireCount} hires · {user.postCount} posts
      </TableCell>
      <TableCell>
        {user.openReports > 0 ? (
          <span className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{user.openReports}</span>
        ) : (
          <span className="text-sm text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canModerate ? <BanCell user={user} onChanged={onChanged} /> : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
    </TableRow>
  )
}

function UserRowMobile({ user, onChanged, canModerate }: { user: AdminUserDTO; onChanged: () => void; canModerate: boolean }) {
  const go = useAppStore((s) => s.go)
  return (
    <div className={cn('rounded-xl border bg-card p-3', user.status === 'BANNED' && 'border-red-500/40 bg-red-500/5')}>
      <div className="flex items-center gap-2.5">
        <UserAvatar src={user.avatar} name={user.name} className="size-10" onClick={() => go('profile', { userId: user.id })} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="block max-w-full truncate text-sm font-bold hover:underline"
            onClick={() => go('profile', { userId: user.id })}
          >
            {user.name}
          </button>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <RoleChips user={user} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
        <span>{user.city ?? '—'}</span>
        <span className="tabular-nums">{user.coins.toLocaleString()} coins</span>
        <span className="tabular-nums">{user.hireCount} hires</span>
        <span className="tabular-nums">{user.postCount} posts</span>
        {user.openReports > 0 ? (
          <span className="font-bold text-amber-600 dark:text-amber-400">{user.openReports} open reports</span>
        ) : null}
      </div>
      {canModerate ? (
        <div className="mt-2.5 border-t pt-2.5">
          <BanCell user={user} onChanged={onChanged} />
        </div>
      ) : null}
    </div>
  )
}

/** User management — search, filter, inspect and ban/unban every StudySir account. */
export function UsersTab() {
  const me = useAppStore((s) => s.me)!
  const [users, setUsers] = useState<AdminUserDTO[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleFilter>('ALL')
  const [status, setStatus] = useState<StatusFilter>('ALL')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.getAdminUsers()
      setUsers(d.users)
    } catch (e) {
      setUsers([])
      toast.error('Could not load users', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users ?? []).filter((u) => {
      if (role !== 'ALL' && u.role !== role) return false
      if (status !== 'ALL' && u.status !== status) return false
      if (q && ![u.name, u.email, u.city ?? ''].some((f) => f.toLowerCase().includes(q))) return false
      return true
    })
  }, [users, query, role, status])

  const filtersDirty = query !== '' || role !== 'ALL' || status !== 'ALL'

  return (
    <div className="space-y-3">
      {/* Search + filters + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, city…"
            className="pl-9"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => void loadUsers()} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pill active={role === 'ALL'} onClick={() => setRole('ALL')}>all roles</Pill>
        {(['TEACHER', 'STUDENT', 'PARENT'] as const).map((r) => (
          <Pill key={r} active={role === r} onClick={() => setRole(r)}>
            {ROLE_LABEL[r].toLowerCase()}
          </Pill>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Pill active={status === 'ALL'} onClick={() => setStatus('ALL')}>any status</Pill>
        <Pill active={status === 'ACTIVE'} onClick={() => setStatus('ACTIVE')}>active</Pill>
        <Pill active={status === 'BANNED'} onClick={() => setStatus('BANNED')}>banned</Pill>
        {filtersDirty ? (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={() => {
              setQuery('')
              setRole('ALL')
              setStatus('ALL')
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {users === null ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState icon={Users} title="No users match" hint="Try a different search term or clear the filters." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((u) => (
                  <UserRowDesktop
                    key={u.id}
                    user={u}
                    onChanged={() => void loadUsers()}
                    canModerate={u.id !== me.id && !u.isAdmin}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {shown.map((u) => (
              <UserRowMobile
                key={u.id}
                user={u}
                onChanged={() => void loadUsers()}
                canModerate={u.id !== me.id && !u.isAdmin}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {shown.length} of {users.length} accounts
          </p>
        </>
      )}
    </div>
  )
}
