'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { api, errorMessage } from '@/lib/api'
import { ALL_ADMIN_MODULES, MODULE_META, type AdminModule } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { UserAvatar } from '../../shared/UserAvatar'
import { EmptyState } from '../../shared/EmptyState'
import { timeAgo } from '../../shared/format'

type StaffMember = Awaited<ReturnType<typeof api.adminStaff>>['staff'][number]

function ModuleToggle({
  moduleKey,
  enabled,
  disabled,
  onToggle,
}: {
  moduleKey: AdminModule
  enabled: boolean
  disabled?: boolean
  onToggle: (on: boolean) => void
}) {
  const meta = MODULE_META[moduleKey]
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
        enabled ? 'border-primary/40 bg-primary/5' : 'bg-card',
        disabled && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="text-[11px] text-muted-foreground">{meta.description}</p>
      </div>
      <Switch checked={enabled} disabled={disabled} onCheckedChange={onToggle} aria-label={`Access ${meta.label}`} />
    </div>
  )
}

function StaffRow({
  member,
  isOwner,
  onEdit,
  onRemove,
}: {
  member: StaffMember
  isOwner: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const targetIsOwner = !member.subRole || member.subRole === 'OWNER'
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <UserAvatar src={member.avatar} name={member.name} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{member.name}</p>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase',
                targetIsOwner ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300' : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300'
              )}
            >
              {targetIsOwner ? 'Owner' : 'Staff'}
            </span>
            {member.status === 'BANNED' ? (
              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
                Suspended
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          <p className="text-[11px] text-muted-foreground">Joined {timeAgo(member.createdAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(member.permissions ?? []).map((m) => (
              <span key={m} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {MODULE_META[m as AdminModule]?.label ?? m}
              </span>
            ))}
            {(!member.permissions || member.permissions.length === 0) && targetIsOwner ? (
              <span className="text-[11px] text-muted-foreground">Full access</span>
            ) : null}
          </div>
        </div>
        {isOwner && !targetIsOwner ? (
          <div className="flex shrink-0 flex-col gap-1.5">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onEdit}>
              <UserCog className="size-4" />
              Edit access
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-red-600 hover:text-red-700" onClick={onRemove}>
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StaffFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  mode: 'create' | 'edit'
  initial?: StaffMember
  onSubmit: (data: { name: string; email: string; password: string; permissions: AdminModule[] }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [perms, setPerms] = useState<AdminModule[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(initial?.name ?? '')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(initial?.email ?? '')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPassword('')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPerms((initial?.permissions as AdminModule[]) ?? ['overview', 'users', 'reports'])
    }
  }, [open, initial])

  function toggle(m: AdminModule) {
    setPerms((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (mode === 'create' && password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (perms.length === 0) {
      toast.error('Select at least one module')
      return
    }
    setBusy(true)
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), password, permissions: perms })
      onOpenChange(false)
    } catch (e) {
      toast.error(mode === 'create' ? 'Could not create staff account' : 'Could not update staff account', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add staff member' : 'Edit staff access'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new staff account and choose exactly which admin modules they can access.'
              : `Adjust ${initial?.name}'s module access, name, or password.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Full name</Label>
              <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@studysir.app" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-pw">{mode === 'create' ? 'Password' : 'New password (leave blank to keep)'}</Label>
            <Input
              id="staff-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'create' ? 'Min 6 characters' : '••••••••'}
              required={mode === 'create'}
            />
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <KeyRound className="size-4" />
              Module access
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Pick exactly which parts of the admin console this staff member can open. They won&apos;t see anything else.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ALL_ADMIN_MODULES.map((m) => (
                <ModuleToggle
                  key={m}
                  moduleKey={m}
                  enabled={perms.includes(m)}
                  onToggle={() => toggle(m)}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="gap-1.5">
              {mode === 'create' ? <Plus className="size-4" /> : <CheckCircle2 className="size-4" />}
              {mode === 'create' ? 'Create staff account' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function StaffTab() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminStaff()
      setStaff(d.staff)
    } catch (e) {
      toast.error('Could not load staff', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function create(data: { name: string; email: string; password: string; permissions: AdminModule[] }) {
    await api.adminCreateStaff(data)
    toast.success('Staff account created')
    await load()
  }

  async function edit(data: { name: string; email: string; password: string; permissions: AdminModule[] }) {
    if (!editTarget) return
    await api.adminUpdateStaff(editTarget.id, {
      name: data.name,
      permissions: data.permissions,
      ...(data.password ? { password: data.password } : {}),
    })
    toast.success('Staff access updated')
    setEditTarget(null)
    await load()
  }

  async function remove() {
    if (!removeTarget) return
    try {
      await api.adminDeleteStaff(removeTarget.id)
      toast.success(`${removeTarget.name} removed from staff`)
      setRemoveTarget(null)
      await load()
    } catch (e) {
      toast.error('Could not remove staff', { description: errorMessage(e) })
    }
  }

  const isOwner = true // StaffTab is only rendered for owners (gated in AdminView)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Platform staff & custom access</p>
          <p className="text-xs text-muted-foreground">
            Add staff accounts and grant them access to exactly the modules they need — full control, module by module.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => void load()} className="gap-1.5">
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Add staff
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : !staff || staff.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No staff accounts yet" hint="Add your first staff member to delegate moderation or finance work." />
        ) : (
          staff.map((m) => (
            <StaffRow
              key={m.id}
              member={m}
              isOwner={isOwner}
              onEdit={() => setEditTarget(m)}
              onRemove={() => setRemoveTarget(m)}
            />
          ))
        )}
      </div>

      <StaffFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" onSubmit={create} />
      <StaffFormDialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)} mode="edit" initial={editTarget ?? undefined} onSubmit={edit} />

      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.name}?</DialogTitle>
            <DialogDescription>
              This revokes their admin access. Their user account stays so their feed history is preserved, but they can no longer log in via the admin entry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void remove()} className="gap-1.5">
              <X className="size-4" />
              Remove access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
