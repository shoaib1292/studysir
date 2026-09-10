'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookUser,
  Bot,
  Brain,
  Clock,
  Coins,
  GraduationCap,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Timer,
  Trash2,
  type LucideIcon,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import type { AiAgentDTO, AiPersona } from '@/lib/types'
import { cn } from '@/lib/utils'
import { UserAvatar } from '../../shared/UserAvatar'

/* ────────────────────────── helpers ────────────────────────── */

/** Display defaults when an agent has no (or a broken) persona JSON. */
const PERSONA_DEFAULTS = {
  activeFrom: 5,
  activeTo: 17,
  minDelaySec: 20,
  maxDelaySec: 90,
} as const

/** Safe aiPersona JSON parse — never throws; missing fields fall back at call sites. */
function personaOf(raw: string | null): Partial<AiPersona> {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AiPersona>
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // broken JSON → empty object → defaults below
    }
  }
  return {}
}

function clampNum(v: string, fallback: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function fmtHour(h: number): string {
  return `${Math.min(24, Math.max(0, Math.round(h)))}:00`
}

type AiStats = Awaited<ReturnType<typeof api.adminAiStats>>

function Chip({ icon: Icon, children, className }: { icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground',
        className
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  )
}

/* ────────────────────────── agent card ────────────────────────── */

function AgentCard({ agent, onEdit, onChanged }: { agent: AiAgentDTO; onEdit: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const p = personaOf(agent.aiPersona)
  const isTeacher = agent.role === 'TEACHER'

  async function remove() {
    setBusy(true)
    try {
      await api.adminDeleteAiAgent(agent.id)
      toast.success(`${agent.name} deleted`, { description: 'The AI agent was removed from StudySir.' })
      setConfirming(false)
      onChanged()
    } catch (e) {
      toast.error('Could not delete agent', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <UserAvatar src={agent.avatar} name={agent.name} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
            <span className="truncate">{agent.name}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold',
                isTeacher ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
              )}
            >
              {isTeacher ? <GraduationCap className="size-3" /> : <BookUser className="size-3" />}
              AI {isTeacher ? 'TEACHER' : 'STUDENT'}
            </span>
            {agent.status === 'BANNED' ? (
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                BANNED
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {p.tagline?.trim() || agent.headline || 'No tagline yet'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={onEdit} aria-label={`Edit ${agent.name}`}>
            <Pencil className="size-3.5" />
          </Button>
          <Popover open={confirming} onOpenChange={setConfirming}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                disabled={busy}
                aria-label={`Delete ${agent.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <p className="text-sm font-semibold">Delete {agent.name}?</p>
              <p className="text-xs text-muted-foreground">
                The AI agent is removed from StudySir permanently. Its past chats stay for records.
              </p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => void remove()}>
                  Delete
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip icon={Coins} className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
          {agent.coins} coins
        </Chip>
        <Chip icon={Clock}>
          Active {fmtHour(p.activeFrom ?? PERSONA_DEFAULTS.activeFrom)}–{fmtHour(p.activeTo ?? PERSONA_DEFAULTS.activeTo)} UTC
        </Chip>
        <Chip icon={Timer}>
          {p.minDelaySec ?? PERSONA_DEFAULTS.minDelaySec}–{p.maxDelaySec ?? PERSONA_DEFAULTS.maxDelaySec}s delay
        </Chip>
      </div>
    </div>
  )
}

/* ────────────────────────── create / edit dialog ────────────────────────── */

interface AgentFormState {
  name: string
  role: 'TEACHER' | 'STUDENT'
  avatar: string | null
  headline: string
  bio: string
  city: string
  subjects: string
  feeMin: string
  feeMax: string
  coins: string
  grantCoins: string
  style: string
  activeFrom: string
  activeTo: string
  minDelaySec: string
  maxDelaySec: string
  mergeWindowSec: string
  replyChance: string
  declineLines: string
}

function buildForm(agent: AiAgentDTO | null): AgentFormState {
  if (!agent) {
    return {
      name: '',
      role: 'TEACHER',
      avatar: null,
      headline: '',
      bio: '',
      city: '',
      subjects: '',
      feeMin: '',
      feeMax: '',
      coins: '100',
      grantCoins: '',
      style: '',
      activeFrom: '5',
      activeTo: '17',
      minDelaySec: '20',
      maxDelaySec: '90',
      mergeWindowSec: '7',
      replyChance: '0.9',
      declineLines: '',
    }
  }
  const p = personaOf(agent.aiPersona)
  return {
    name: agent.name,
    role: agent.role === 'STUDENT' ? 'STUDENT' : 'TEACHER',
    avatar: agent.avatar,
    headline: agent.headline ?? '',
    bio: agent.bio ?? '',
    city: agent.city ?? '',
    subjects: agent.subjects ?? '',
    feeMin: agent.feeMin != null ? String(agent.feeMin) : '',
    feeMax: agent.feeMax != null ? String(agent.feeMax) : '',
    coins: String(agent.coins),
    grantCoins: '',
    style: p.style ?? '',
    activeFrom: String(p.activeFrom ?? 5),
    activeTo: String(p.activeTo ?? 17),
    minDelaySec: String(p.minDelaySec ?? 20),
    maxDelaySec: String(p.maxDelaySec ?? 90),
    mergeWindowSec: String(p.mergeWindowSec ?? 7),
    replyChance: String(p.replyChance ?? 0.9),
    declineLines: (p.declineChances ?? []).join('\n'),
  }
}

/**
 * Shared dialog for creating and editing an AI agent.
 * Create → POST with persona fields FLAT at top level + `coins`.
 * Edit → PATCH with persona nested under `persona` + optional `grantCoins`.
 */
function AgentDialog({
  open,
  onOpenChange,
  agent,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create mode */
  agent: AiAgentDTO | null
  onSaved: () => void
}) {
  const isEdit = !!agent
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [f, setF] = useState<AgentFormState>(() => buildForm(agent))
  const fileRef = useRef<HTMLInputElement>(null)
  const isTeacher = f.role === 'TEACHER'

  function set<K extends keyof AgentFormState>(key: K, value: AgentFormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }))
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setUploading(true)
    try {
      set('avatar', (await api.uploadImage('avatars', file)).url)
    } catch (err) {
      toast.error('Could not process image', { description: errorMessage(err) })
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!f.name.trim()) {
      toast.error('Name is required', { description: 'Give the agent a realistic human name.' })
      return
    }
    setBusy(true)
    try {
      const minDelay = clampNum(f.minDelaySec, 20, 3, 3600)
      const maxDelay = Math.max(minDelay, clampNum(f.maxDelaySec, 90, 5, 7200))
      const declineChances = f.declineLines
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6)

      if (isEdit && agent) {
        const grant = Math.max(0, Math.round(Number(f.grantCoins) || 0))
        await api.adminUpdateAiAgent(agent.id, {
          name: f.name.trim(),
          ...(f.avatar && f.avatar !== agent.avatar ? { avatar: f.avatar } : {}),
          headline: f.headline.trim(),
          bio: f.bio.trim(),
          city: f.city.trim(),
          ...(isTeacher
            ? {
                subjects: f.subjects.trim(),
                feeMin: Math.max(0, Number(f.feeMin) || 0),
                feeMax: Math.max(0, Number(f.feeMax) || 0),
              }
            : {}),
          ...(grant > 0 ? { grantCoins: grant } : {}),
          persona: {
            tagline: personaOf(agent.aiPersona).tagline?.trim() || f.headline.trim(),
            style: f.style.trim(),
            activeFrom: clampNum(f.activeFrom, 5, 0, 23),
            activeTo: clampNum(f.activeTo, 17, 0, 24),
            minDelaySec: minDelay,
            maxDelaySec: maxDelay,
            mergeWindowSec: clampNum(f.mergeWindowSec, 7, 2, 120),
            replyChance: clampNum(f.replyChance, 0.9, 0, 1),
            declineChances,
          },
        })
        toast.success('Agent updated', {
          description:
            grant > 0
              ? `${grant} coins granted to ${f.name.trim()}.`
              : `${f.name.trim()}'s profile and persona were saved.`,
        })
      } else {
        await api.adminCreateAiAgent({
          name: f.name.trim(),
          role: f.role,
          ...(f.avatar ? { avatar: f.avatar } : {}),
          headline: f.headline.trim(),
          bio: f.bio.trim(),
          city: f.city.trim(),
          ...(isTeacher
            ? {
                subjects: f.subjects.trim(),
                feeMin: Math.max(0, Number(f.feeMin) || 0),
                feeMax: Math.max(0, Number(f.feeMax) || 0),
                coins: Math.max(0, Math.round(Number(f.coins) || 0)),
              }
            : {}),
          tagline: f.headline.trim() || (f.role === 'TEACHER' ? 'AI teacher on StudySir' : 'AI student on StudySir'),
          style: f.style.trim(),
          activeFrom: clampNum(f.activeFrom, 5, 0, 23),
          activeTo: clampNum(f.activeTo, 17, 0, 24),
          minDelaySec: minDelay,
          maxDelaySec: maxDelay,
          mergeWindowSec: clampNum(f.mergeWindowSec, 7, 2, 120),
          replyChance: clampNum(f.replyChance, 0.9, 0, 1),
          declineChances,
        })
        toast.success(`${f.name.trim()} is live on StudySir`, {
          description: `AI ${f.role === 'TEACHER' ? 'teacher' : 'student'} created — it now chats with its own persona.`,
        })
      }
      onSaved()
    } catch (e) {
      toast.error(isEdit ? 'Could not update agent' : 'Could not create agent', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-4 text-[#1877F2]" />
            {isEdit ? `Edit ${agent?.name}` : 'New AI Agent'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Profile, coins and humanlike persona for this agent.'
              : 'Creates a humanlike user that chats, accepts and hires on StudySir.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* role (create only — role is fixed after creation) */}
          {!isEdit ? (
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Agent role">
              <button
                type="button"
                role="radio"
                aria-checked={f.role === 'TEACHER'}
                onClick={() => set('role', 'TEACHER')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors',
                  f.role === 'TEACHER'
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-secondary'
                )}
              >
                <GraduationCap className="size-4" />
                AI Teacher
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={f.role === 'STUDENT'}
                onClick={() => set('role', 'STUDENT')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors',
                  f.role === 'STUDENT'
                    ? 'border-[#1877F2]/60 bg-[#1877F2]/10 text-[#1877F2] dark:text-blue-300'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-secondary'
                )}
              >
                <BookUser className="size-4" />
                AI Student
              </button>
            </div>
          ) : null}

          {/* name + avatar upload */}
          <div className="flex items-end gap-3 rounded-lg bg-muted/50 p-3">
            {f.avatar ? (
              <img src={f.avatar} alt={`${f.name || 'Agent'} preview`} className="size-14 shrink-0 rounded-full object-cover" />
            ) : (
              <UserAvatar name={f.name || 'New Agent'} className="size-14" />
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="agent-name">Name *</Label>
              <Input
                id="agent-name"
                value={f.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Ayesha Khan"
                maxLength={80}
              />
            </div>
            <div className="shrink-0 pb-0.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPickAvatar(e)}
                aria-hidden="true"
                tabIndex={-1}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
                Photo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="agent-headline">Headline</Label>
              <Input
                id="agent-headline"
                value={f.headline}
                onChange={(e) => set('headline', e.target.value)}
                placeholder={isTeacher ? 'e.g. Math tutor, 8 yrs experience' : 'e.g. FSc student, need tuition'}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-city">City</Label>
              <Input
                id="agent-city"
                value={f.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="e.g. Lahore"
                maxLength={80}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agent-bio">Bio</Label>
            <Textarea
              id="agent-bio"
              rows={2}
              value={f.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="A short human-sounding description"
              maxLength={2000}
            />
          </div>

          {isTeacher ? (
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="agent-subjects">Subjects</Label>
                <Input
                  id="agent-subjects"
                  value={f.subjects}
                  onChange={(e) => set('subjects', e.target.value)}
                  placeholder="Math, Physics"
                  maxLength={300}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-feemin">Fee min</Label>
                <Input id="agent-feemin" type="number" min={0} value={f.feeMin} onChange={(e) => set('feeMin', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-feemax">Fee max</Label>
                <Input id="agent-feemax" type="number" min={0} value={f.feeMax} onChange={(e) => set('feeMax', e.target.value)} />
              </div>
            </div>
          ) : null}

          {/* coins — initial funding on create (teachers), grant on edit */}
          {!isEdit ? (
            isTeacher ? (
              <div className="space-y-1.5">
                <Label htmlFor="agent-coins">Initial coins</Label>
                <Input
                  id="agent-coins"
                  type="number"
                  min={0}
                  max={100000}
                  value={f.coins}
                  onChange={(e) => set('coins', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  AI teachers pay coins to accept students — fund them here (default 100).
                </p>
              </div>
            ) : null
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="agent-grant">Grant coins</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="agent-grant"
                  type="number"
                  min={0}
                  max={100000}
                  value={f.grantCoins}
                  onChange={(e) => set('grantCoins', e.target.value)}
                  placeholder="e.g. 200"
                />
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  current: <b className="tabular-nums">{agent?.coins ?? 0}</b>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Added on top of the current balance — leave empty for none.</p>
            </div>
          )}

          {/* persona */}
          <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Brain className="size-3.5" />
                Persona — humanlike behaviour
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Never replies instantly, merges quick messages, sleeps outside active hours and sometimes declines.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-style">Style</Label>
              <Textarea
                id="agent-style"
                rows={2}
                value={f.style}
                onChange={(e) => set('style', e.target.value)}
                placeholder="How they talk — e.g. casual Roman Urdu + English mix, short WhatsApp-style texts"
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agent-activefrom">Active from</Label>
                <Input
                  id="agent-activefrom"
                  type="number"
                  min={0}
                  max={23}
                  value={f.activeFrom}
                  onChange={(e) => set('activeFrom', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">UTC hours (0–23)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-activeto">Active to</Label>
                <Input
                  id="agent-activeto"
                  type="number"
                  min={0}
                  max={24}
                  value={f.activeTo}
                  onChange={(e) => set('activeTo', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">UTC hours (0–24)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-mindelay">Min delay (sec)</Label>
                <Input
                  id="agent-mindelay"
                  type="number"
                  min={3}
                  max={3600}
                  value={f.minDelaySec}
                  onChange={(e) => set('minDelaySec', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-maxdelay">Max delay (sec)</Label>
                <Input
                  id="agent-maxdelay"
                  type="number"
                  min={5}
                  max={7200}
                  value={f.maxDelaySec}
                  onChange={(e) => set('maxDelaySec', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-merge">Merge window (sec)</Label>
                <Input
                  id="agent-merge"
                  type="number"
                  min={2}
                  max={120}
                  value={f.mergeWindowSec}
                  onChange={(e) => set('mergeWindowSec', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Wait this long for follow-up messages before replying.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-reply">Reply chance (0–1)</Label>
                <Input
                  id="agent-reply"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={f.replyChance}
                  onChange={(e) => set('replyChance', e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Chance to reply when a real user messages — lower = ignores more.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-decline">Decline lines</Label>
              <Textarea
                id="agent-decline"
                rows={3}
                value={f.declineLines}
                onChange={(e) => set('declineLines', e.target.value)}
                placeholder={'One per line — polite excuses used with real users, e.g.\nSorry, my schedule is full this month.'}
                maxLength={1200}
              />
              <p className="text-[11px] text-muted-foreground">One per line (max 6) — used to politely decline or leave on read.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy || uploading}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {isEdit ? 'Save changes' : 'Create agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ────────────────────────── tab ────────────────────────── */

export function AiEngineTab() {
  const [stats, setStats] = useState<AiStats | null>(null)
  const [agents, setAgents] = useState<AiAgentDTO[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; agent: AiAgentDTO } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, a] = await Promise.all([api.adminAiStats(), api.adminAiAgents()])
      setStats(s)
      setAgents(a.agents)
    } catch (e) {
      toast.error('Could not load AI engine data', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // sorted by coins desc (runtime guard: tolerate a legacy scalar from an older backend)
  const wasted = useMemo(() => {
    const list = stats?.wastedCoinsByRealTeachers
    if (!list || !Array.isArray(list)) return []
    return [...list].sort((a, b) => b.coins - a.coins)
  }, [stats])
  const wastedTotal = useMemo(() => wasted.reduce((a, w) => a + w.coins, 0), [wasted])
  const agentCount = agents ? agents.length : (stats?.agents.length ?? 0)

  function openEdit(agent: AiAgentDTO) {
    setDialog({ mode: 'edit', agent })
  }

  if (loading && !stats && !agents) {
    return (
      <div className="mt-3 space-y-3">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid gap-2.5 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats || !agents) return null

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Humanlike agents · delayed replies, merge windows, active hours · updates on refresh
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialog({ mode: 'create' })}>
            <Plus className="size-3.5" />
            New AI Agent
          </Button>
        </div>
      </div>

      {/* header chips — LLM provider, AI messages, agents */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-semibold">
          <span className="size-2 animate-pulse rounded-full bg-green-500" aria-hidden />
          <Brain className="size-3.5 text-muted-foreground" />
          LLM: {stats.llmProvider || 'unknown'}
        </span>
        <Chip icon={Sparkles} className="border border-transparent px-2.5 py-1.5 text-xs">
          {stats.aiMessages} AI messages
        </Chip>
        <Chip icon={Bot} className="border border-transparent px-2.5 py-1.5 text-xs">
          {agentCount} agents
        </Chip>
      </div>

      {/* wasted coins (requirement F) */}
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
          <Coins className="size-4 text-amber-500" />
          Wasted coins — real teachers × AI students
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          When StudySir reaches 1,000 paid teachers, spent coins are refunded as a bonus (Economy tab).
        </p>
        {wasted.length === 0 ? (
          <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            No real teacher has spent coins on AI agents yet.
          </p>
        ) : (
          <>
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {wasted.map((w, i) => (
                <li key={w.teacherId} className="flex items-center gap-3 rounded-lg bg-muted/60 p-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {i + 1}
                  </span>
                  <UserAvatar src={null} name={w.teacherName} className="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{w.teacherName}</p>
                    <p className="text-[11px] text-muted-foreground">Wasted chatting with AI students</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {w.coins} <span className="text-xs font-medium">coins</span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right text-[11px] font-medium text-muted-foreground">
              Total <b className="tabular-nums text-amber-600 dark:text-amber-400">{wastedTotal}</b> coins tracked for the
              milestone refund
            </p>
          </>
        )}
      </section>

      {/* AI agents */}
      <section className="space-y-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Bot className="size-4 text-[#1877F2]" />
          AI agents
          <span className="text-xs font-medium text-muted-foreground">({agents.length})</span>
        </h2>
        {agents.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No AI agents yet — create the first one with “New AI Agent”.
          </p>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {agents.map((a) => (
              <AgentCard key={a.id} agent={a} onEdit={() => openEdit(a)} onChanged={() => void load()} />
            ))}
          </div>
        )}
      </section>

      {dialog ? (
        <AgentDialog
          key={dialog.mode === 'edit' ? `edit-${dialog.agent.id}` : 'create'}
          open
          agent={dialog.mode === 'edit' ? dialog.agent : null}
          onOpenChange={(o) => {
            if (!o) setDialog(null)
          }}
          onSaved={() => {
            setDialog(null)
            void load()
          }}
        />
      ) : null}
    </div>
  )
}
