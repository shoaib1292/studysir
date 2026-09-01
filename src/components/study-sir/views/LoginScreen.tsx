'use client'

import { useEffect, useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import type { UserDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { ROLE_CHIP, ROLE_LABEL } from '../shared/constants'
import { UserAvatar } from '../shared/UserAvatar'

function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-2.5">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function LoginScreen() {
  const setMe = useAppStore((s) => s.setMe)
  const resetNav = useAppStore((s) => s.resetNav)

  const [users, setUsers] = useState<UserDTO[] | null>(null)
  const [loggingIn, setLoggingIn] = useState<string | null>(null)

  useEffect(() => {
    api
      .getUsers()
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]))
  }, [])

  async function pick(user: UserDTO) {
    if (loggingIn) return
    setLoggingIn(user.id)
    try {
      const { user: me } = await api.login(user.id)
      setMe(me)
      resetNav()
    } catch (e) {
      toast.error('Login failed', { description: errorMessage(e) })
      setLoggingIn(null)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#F0F2F5] p-4">
      <div className="card-shadow w-full max-w-md rounded-xl bg-card p-6 sm:p-8">
        <div className="text-center">
          <p className="text-4xl font-extrabold tracking-tight text-[#1877F2]">
            Study<span className="font-black">Sir</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Connect Students &amp; Teachers — post tution, hire teachers, buy digital goods
          </p>
        </div>

        <div className="my-6 border-t" />

        <p className="mb-3 text-sm font-semibold text-muted-foreground">Log in as (demo)</p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {users === null
            ? [0, 1, 2, 3, 4, 5].map((i) => <UserCardSkeleton key={i} />)
            : users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={loggingIn !== null}
                  onClick={() => pick(user)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:bg-[#F0F2F5] disabled:opacity-60'
                  )}
                >
                  <UserAvatar src={user.avatar} name={user.name} className="size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{user.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', ROLE_CHIP[user.role])}>
                        {ROLE_LABEL[user.role]}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Coins className="size-3 text-amber-500" />
                        {user.coins}
                      </span>
                    </span>
                  </span>
                  {loggingIn === user.id ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-[#1877F2]" />
                  ) : null}
                </button>
              ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">Demo platform — pick any account</p>
      </div>
    </div>
  )
}
