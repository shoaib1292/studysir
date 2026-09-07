'use client'

import { useState } from 'react'
import { LogIn, UserPlus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, errorMessage } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import { toast } from 'sonner'
import type { UserDTO } from '@/lib/types'
import { ROLE_CHIP, ROLE_LABEL } from '../shared/constants'
import { UserAvatar } from '../shared/UserAvatar'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'login' | 'signup'

export function LoginPromptDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (user: UserDTO) => void
}) {
  const setMe = useAppStore((s) => s.setMe)
  const resetNav = useAppStore((s) => s.resetNav)

  const [mode, setMode] = useState<Mode>('login')
  const [users, setUsers] = useState<UserDTO[]>([])
  const [loggingIn, setLoggingIn] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('STUDENT')
  const [busy, setBusy] = useState(false)

  // Load demo users when dialog opens
  if (open && users.length === 0) {
    api.getUsers().then((d) => setUsers(d.users)).catch(() => setUsers([]))
  }

  function done(user: UserDTO) {
    setMe(user)
    resetNav()
    onOpenChange(false)
    onSuccess?.(user)
  }

  async function pick(user: UserDTO) {
    if (loggingIn) return
    setLoggingIn(user.id)
    try {
      const { user: me } = await api.login(user.id)
      done(me)
    } catch (e) {
      toast.error('Login failed', { description: errorMessage(e) })
      setLoggingIn(null)
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (mode === 'login') {
        const { user } = await api.loginWithPassword(email.trim(), password)
        toast.success(`Welcome back, ${user.name}!`)
        done(user)
      } else {
        const { user } = await api.signup({ name: name.trim(), email: email.trim(), password, role })
        toast.success(`Account created — welcome, ${user.name}!`)
        done(user)
      }
    } catch (err) {
      toast.error(mode === 'login' ? 'Login failed' : 'Signup failed', { description: errorMessage(err) })
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="size-5 text-[#1877F2]" />
            Login Required
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Please log in or create an account to continue
          </p>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="gap-1.5">
              <LogIn className="size-4" /> Log in
            </TabsTrigger>
            <TabsTrigger value="signup" className="gap-1.5">
              <UserPlus className="size-4" /> Sign up
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={submitEmail} className="mt-3 space-y-3">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="prompt-fullname">Full name</Label>
              <Input
                id="prompt-fullname"
                placeholder="e.g. Ali Raza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="prompt-email">Email</Label>
            <Input
              id="prompt-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prompt-password">Password</Label>
            <Input
              id="prompt-password"
              type="password"
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {mode === 'signup' && (
            <div className="flex gap-2">
              {['STUDENT', 'PARENT', 'TEACHER'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'flex-1 rounded-lg border p-2 text-center text-xs font-semibold transition-colors',
                    role === r && 'border-[#1877F2] bg-[#1877F2]/5 text-[#1877F2]'
                  )}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full gap-2 bg-[#1877F2] hover:bg-[#166fe0]">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <div className="my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or quick demo login</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto pr-1">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              disabled={loggingIn !== null || busy}
              onClick={() => pick(user)}
              className="flex items-center gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-muted disabled:opacity-60"
            >
              <UserAvatar src={user.avatar} name={user.name} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{user.name}</span>
                <span className={cn('rounded px-1 py-0.5 text-[9px] font-semibold', ROLE_CHIP[user.role])}>
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
