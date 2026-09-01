'use client'

import { useEffect, useState } from 'react'
import { Ban, Loader2, LogOut, MonitorCog, Moon, Save, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage, type ProfilePatch } from '@/lib/api'
import type { AvailabilityDTO } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { AVATAR_OPTIONS, COVER_OPTIONS, ROLE_LABEL } from '../shared/constants'
import { FbCard } from '../shared/bits'
import { AvailabilityEditor } from '../shared/AvailabilityEditor'
import { SafeImage } from '../shared/SafeImage'
import { UserAvatar } from '../shared/UserAvatar'

interface SettingsForm {
  name: string
  headline: string
  city: string
  bio: string
  subjects: string
  languages: string
  qualification: string
  gender: string
  feeMin: string
  feeMax: string
  avatar: string
  coverImage: string
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-lg font-bold">{children}</h2>
}

export function SettingsView() {
  const me = useAppStore((s) => s.me)!
  const setMe = useAppStore((s) => s.setMe)
  const refreshMe = useAppStore((s) => s.refreshMe)

  const [form, setForm] = useState<SettingsForm>(() => ({
    name: me.name,
    headline: me.headline ?? '',
    city: me.city ?? '',
    bio: me.bio ?? '',
    subjects: me.subjects ?? '',
    languages: me.languages ?? '',
    qualification: me.qualification ?? '',
    gender: me.gender ?? '',
    feeMin: me.feeMin === null ? '' : String(me.feeMin),
    feeMax: me.feeMax === null ? '' : String(me.feeMax),
    avatar: me.avatar ?? '',
    coverImage: me.coverImage ?? '',
  }))
  const [saving, setSaving] = useState(false)

  const isTeacher = me.role === 'TEACHER'

  const set = (key: keyof SettingsForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const min = Number(form.feeMin)
      const max = Number(form.feeMax)
      const patch: ProfilePatch = {
        name: form.name.trim() || me.name,
        headline: form.headline.trim() || undefined,
        city: form.city.trim() || undefined,
        bio: form.bio.trim() || undefined,
        subjects: form.subjects.trim() || undefined,
        languages: form.languages.trim() || undefined,
        qualification: form.qualification.trim() || undefined,
        gender: form.gender || undefined,
        avatar: form.avatar || null,
        coverImage: form.coverImage || null,
        feeMin: isTeacher && Number.isFinite(min) && form.feeMin !== '' ? min : null,
        feeMax: isTeacher && Number.isFinite(max) && form.feeMax !== '' ? max : null,
      }
      await api.updateProfile(me.id, patch)
      await refreshMe()
      toast.success('Profile updated')
    } catch (e) {
      toast.error('Could not save profile', { description: errorMessage(e) })
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    try {
      await api.logout()
    } catch {
      // session may already be gone
    }
    setMe(null)
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Profile */}
      <section className="space-y-3">
        <SectionTitle>Profile</SectionTitle>
        <FbCard className="space-y-4 p-4">
          {/* Avatar + cover pickers */}
          <div className="flex flex-wrap items-start gap-4">
            <UserAvatar src={form.avatar || null} name={form.name || me.name} className="size-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Avatar</Label>
                <div className="mt-1.5 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      aria-label={`Pick avatar ${opt}`}
                      onClick={() => set('avatar')(opt)}
                      className={cn(
                        'size-12 overflow-hidden rounded-full ring-2 transition-all',
                        form.avatar === opt ? 'ring-[#1877F2]' : 'ring-transparent hover:ring-muted-foreground/40'
                      )}
                    >
                      <SafeImage src={opt} alt="avatar option" className="h-12 w-12 object-cover" iconClassName="size-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cover</Label>
                <div className="mt-1.5 flex gap-2">
                  {COVER_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      aria-label={`Pick cover ${opt}`}
                      onClick={() => set('coverImage')(opt)}
                      className={cn(
                        'h-12 w-20 overflow-hidden rounded-lg ring-2 transition-all',
                        form.coverImage === opt ? 'ring-[#1877F2]' : 'ring-transparent hover:ring-muted-foreground/40'
                      )}
                    >
                      <SafeImage src={opt} alt="cover option" className="h-12 w-20 object-cover" iconClassName="size-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="st-name">Name</Label>
              <Input id="st-name" value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={80} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-headline">Headline</Label>
              <Input id="st-headline" value={form.headline} onChange={(e) => set('headline')(e.target.value)} placeholder="e.g. Student · Class 10th" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-city">City</Label>
              <Input id="st-city" value={form.city} onChange={(e) => set('city')(e.target.value)} placeholder="e.g. Mumbai" />
            </div>
            <div className="grid gap-1.5">
              <Label>Gender</Label>
              <Select value={form.gender || undefined} onValueChange={set('gender')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-subjects">Subjects</Label>
              <Input id="st-subjects" value={form.subjects} onChange={(e) => set('subjects')(e.target.value)} placeholder="Math, English" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="st-languages">Languages</Label>
              <Input id="st-languages" value={form.languages} onChange={(e) => set('languages')(e.target.value)} placeholder="English, Hindi" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="st-qual">Qualification</Label>
              <Input id="st-qual" value={form.qualification} onChange={(e) => set('qualification')(e.target.value)} placeholder="e.g. Bachelors in Finance" />
            </div>
            {isTeacher ? (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="st-feemin">Fee min ($)</Label>
                  <Input id="st-feemin" type="number" min={0} value={form.feeMin} onChange={(e) => set('feeMin')(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="st-feemax">Fee max ($)</Label>
                  <Input id="st-feemax" type="number" min={0} value={form.feeMax} onChange={(e) => set('feeMax')(e.target.value)} />
                </div>
              </>
            ) : null}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="st-bio">Bio</Label>
              <Textarea id="st-bio" value={form.bio} onChange={(e) => set('bio')(e.target.value)} rows={3} maxLength={1000} placeholder="Tell people about yourself…" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Role: {ROLE_LABEL[me.role]} (fixed in demo)</p>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </FbCard>
      </section>

      {/* Time availability (teachers) */}
      {isTeacher ? <AvailabilitySection /> : null}

      {/* Appearance */}
      <section className="space-y-3">
        <SectionTitle>Appearance</SectionTitle>
        <AppearanceCard />
      </section>

      {/* Blocked users */}
      <section className="space-y-3">
        <SectionTitle>Blocked Users</SectionTitle>
        <BlockedUsersCard />
      </section>

      {/* Session */}
      <section className="space-y-3">
        <SectionTitle>Session</SectionTitle>
        <FbCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Demo mode — switch account anytime from the header menu.
          </p>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </FbCard>
      </section>
    </div>
  )
}

function AvailabilitySection() {
  const me = useAppStore((s) => s.me)!
  const [initial, setInitial] = useState<AvailabilityDTO[] | null>(null)

  useEffect(() => {
    let alive = true
    api
      .getUser(me.id)
      .then((d) => {
        if (alive) setInitial(d.availabilities)
      })
      .catch(() => {
        if (alive) setInitial([])
      })
    return () => {
      alive = false
    }
  }, [me.id])

  return (
    <section className="space-y-3">
      <SectionTitle>Time Availability</SectionTitle>
      <FbCard className="p-4">
        {initial === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : (
          <AvailabilityEditor initial={initial} />
        )}
      </FbCard>
    </section>
  )
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ] as const

  return (
    <FbCard className="p-4">
      <div className="flex items-center gap-2">
        <MonitorCog className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Theme</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Choose how StudySir looks on this device.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Color theme">
        {options.map((opt) => {
          const Icon = opt.icon
          const active = mounted && theme === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                active
                  ? 'border-[#1877F2] bg-blue-500/10 text-foreground ring-1 ring-[#1877F2]'
                  : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="size-4" aria-hidden />
              {opt.label}
            </button>
          )
        })}
      </div>
    </FbCard>
  )
}

function BlockedUsersCard() {
  const [users, setUsers] = useState<Array<{ id: string; name: string; avatar: string | null }> | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    try {
      const d = await api.getBlockedUsers()
      setUsers(d.users)
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function unblock(userId: string, name: string) {
    setBusyId(userId)
    try {
      await api.unblockUser(userId)
      toast.success(`Unblocked ${name}`)
      await load()
    } catch (e) {
      toast.error('Could not unblock', { description: errorMessage(e) })
    } finally {
      setBusyId(null)
    }
  }

  if (users === null) {
    return (
      <FbCard className="space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </FbCard>
    )
  }

  return (
    <FbCard className="p-4">
      {users.length === 0 ? (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Ban className="size-4" />
          No blocked users
        </p>
      ) : (
        <div className="divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <UserAvatar src={u.avatar} name={u.name} className="size-9" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{u.name}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId !== null}
                onClick={() => unblock(u.id, u.name)}
              >
                {busyId === u.id ? 'Unblocking…' : 'Unblock'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </FbCard>
  )
}
