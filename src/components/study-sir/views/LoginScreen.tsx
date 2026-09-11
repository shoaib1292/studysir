'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Coins,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { api, errorMessage, ApiError } from '@/lib/api'
import type { UserDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAppStore } from '@/store/useAppStore'
import { useMoney } from '@/store/useCurrencyStore'
import { ROLE_CHIP, ROLE_LABEL } from '../shared/constants'
import { UserAvatar } from '../shared/UserAvatar'

type Mode = 'login' | 'signup'

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

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Student', icon: GraduationCap, hint: 'Find teachers, post tuition free' },
  { value: 'PARENT', label: 'Parent', icon: UserPlus, hint: 'Hire for your children' },
  { value: 'TEACHER', label: 'Teacher', icon: Coins, hint: 'Accept requests, earn money' },
]

export function LoginScreen({
  initialMode,
  onBack,
}: {
  /** Pre-select the Log in / Sign up tab (e.g. arriving from a landing CTA). */
  initialMode?: 'login' | 'signup'
  /** When provided, shows a back button returning to the public landing page. */
  onBack?: () => void
}) {
  const setMe = useAppStore((s) => s.setMe)
  const resetNav = useAppStore((s) => s.resetNav)
  const { fmt } = useMoney(null)

  const [users, setUsers] = useState<UserDTO[] | null>(null)
  const [loggingIn, setLoggingIn] = useState<string | null>(null)

  const [mode, setMode] = useState<Mode>(initialMode ?? 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('STUDENT')
  const [busy, setBusy] = useState(false)

  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)

  const [adminOpen, setAdminOpen] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPw, setAdminPw] = useState('')
  const [adminBusy, setAdminBusy] = useState(false)

  useEffect(() => {
    api
      .getUsers()
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]))
  }, [])

  // Affiliate attribution: remember ?ref=CODE across login/signup so the
  // Pricing screen can attach the referral when the user later buys a plan.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && /^[A-Za-z0-9-]{2,20}$/.test(ref)) {
      try {
        localStorage.setItem('ss_ref', ref.toUpperCase())
      } catch {
        // private mode — ignore
      }
    }
  }, [])

  function done(user: UserDTO) {
    setMe(user)
    resetNav()
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
        const res = await api.signup({ name: name.trim(), email: email.trim(), password, role })
        if (res.requireEmailVerification && res.email) {
          setVerificationEmail(res.email)
          setVerifyCode('')
          toast.success('Account created — check your email for the code')
          setBusy(false)
          return
        }
        if (res.user) {
          toast.success(`Account created — welcome, ${res.user.name}!`)
          done(res.user)
          return
        }
        toast.error('Signup failed', { description: 'Unexpected response' })
        setBusy(false)
      }
    } catch (err) {
      if (err instanceof ApiError && (err.data as { code?: string } | null)?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationEmail(email.trim())
        setVerifyCode('')
        toast.info('Verify your email to continue')
        setBusy(false)
        return
      }
      toast.error(mode === 'login' ? 'Login failed' : 'Signup failed', { description: errorMessage(err) })
      setBusy(false)
    }
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault()
    if (verifyBusy || !verificationEmail) return
    setVerifyBusy(true)
    try {
      const { user } = await api.verifyEmail(verificationEmail, verifyCode.trim())
      toast.success(`Welcome, ${user.name}!`)
      done(user)
    } catch (err) {
      toast.error('Verification failed', { description: errorMessage(err) })
      setVerifyBusy(false)
    }
  }

  async function resendCode() {
    if (!verificationEmail || verifyBusy) return
    setVerifyBusy(true)
    try {
      await api.resendVerification(verificationEmail)
      toast.success('Code sent again — check your email')
    } catch (err) {
      toast.error('Could not resend code', { description: errorMessage(err) })
    } finally {
      setVerifyBusy(false)
    }
  }

  async function submitAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (adminBusy) return
    setAdminBusy(true)
    try {
      const { user } = await api.adminLogin(adminEmail.trim(), adminPw)
      toast.success('Admin access granted')
      setAdminOpen(false)
      done(user)
    } catch (err) {
      toast.error('Admin login failed', { description: errorMessage(err) })
      setAdminBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="card-shadow w-full max-w-md rounded-xl bg-card p-6 sm:p-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : null}
        <div className="text-center">
          <p className="font-logo text-4xl tracking-tight text-[#1877F2]">StudySir</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Connect Students &amp; Teachers — post tuition free, hire teachers, buy digital goods
          </p>
        </div>

        {verificationEmail ? (
          <div className="mt-6 rounded-xl border p-4">
            <div className="text-center">
              <ShieldCheck className="mx-auto size-8 text-[#1877F2]" />
              <p className="mt-2 text-sm text-muted-foreground">We sent a 6-digit code to</p>
              <p className="font-semibold">{verificationEmail}</p>
            </div>
            <form onSubmit={submitVerify} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="verify-code">Verification code</Label>
                <Input
                  id="verify-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoComplete="one-time-code"
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>
              <Button type="submit" disabled={verifyBusy} className="w-full gap-2 bg-[#1877F2] hover:bg-[#166fe0]">
                {verifyBusy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Verify email
              </Button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setVerificationEmail(null)} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                  Back
                </button>
                <button type="button" onClick={resendCode} disabled={verifyBusy} className="text-xs font-medium text-[#1877F2] hover:underline disabled:opacity-60">
                  Resend code
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="gap-1.5">
              <LogIn className="size-4" /> Log in
            </TabsTrigger>
            <TabsTrigger value="signup" className="gap-1.5">
              <UserPlus className="size-4" /> Sign up
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={submitEmail} className="mt-4 space-y-3">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="fullname">Full name</Label>
              <Input
                id="fullname"
                placeholder="e.g. Ali Raza"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                className="pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label>I am a</Label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'rounded-xl border p-2.5 text-center transition-colors hover:bg-muted',
                      role === r.value && 'border-[#1877F2] bg-[#1877F2]/5 ring-1 ring-[#1877F2]'
                    )}
                  >
                    <r.icon className={cn('mx-auto size-5', role === r.value ? 'text-[#1877F2]' : 'text-muted-foreground')} />
                    <span className="mt-1 block text-xs font-semibold">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {role === 'TEACHER'
                  ? 'Teachers get welcome coins — coins are spent when you accept student requests.'
                  : 'Students & parents post and request FREE — no coins needed, pay only in the store.'}
              </p>
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full gap-2 bg-[#1877F2] hover:bg-[#166fe0]">
            {busy ? <Loader2 className="size-4 animate-spin" /> : mode === 'login' ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">or use a demo account</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 [scrollbar-width:thin]">
          {users === null
            ? [0, 1, 2, 3, 4, 5].map((i) => <UserCardSkeleton key={i} />)
            : users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={loggingIn !== null || busy}
                  onClick={() => pick(user)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:bg-muted disabled:opacity-60'
                  )}
                >
                  <UserAvatar src={user.avatar} name={user.name} className="size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{user.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', ROLE_CHIP[user.role])}>
                        {ROLE_LABEL[user.role]}
                      </span>
                      {user.role === 'TEACHER' ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Coins className="size-3 text-amber-500" />
                          {user.coins}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Wallet className="size-3 text-emerald-600" />
                          {fmt(user.money)}
                        </span>
                      )}
                    </span>
                  </span>
                  {loggingIn === user.id ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-[#1877F2]" />
                  ) : null}
                </button>
              ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <p className="text-xs text-muted-foreground">Demo platform — pick any account</p>
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-[#1877F2]"
          >
            <ShieldCheck className="size-3.5" />
            Admin Login
          </button>
        </div>
        </>
        )}
      </div>

      {/* Separate platform-admin login dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#1877F2]" />
              Platform Admin Login
            </DialogTitle>
            <DialogDescription>
              Separate staff entrance — only StudySir administration accounts can sign in here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAdmin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Admin email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@studysir.app"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-pw">Admin password</Label>
              <Input
                id="admin-pw"
                type="password"
                placeholder="••••••••"
                value={adminPw}
                onChange={(e) => setAdminPw(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={adminBusy} className="w-full gap-2 bg-[#1877F2] hover:bg-[#166fe0]">
              {adminBusy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Sign in to Admin Panel
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Normal user? Close this and log in above.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
