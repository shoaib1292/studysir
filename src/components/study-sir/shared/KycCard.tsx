'use client'

// Teacher KYC card (requirement E): submit CNIC photo + details, admin verifies.
import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Camera, IdCard, Loader2, ShieldAlert, ShieldCheck, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fileToCompactDataUrl } from '@/lib/image'
import { FbCard } from './bits'

interface KycState {
  status: string
  fullName?: string
  city?: string
  adminNote?: string | null
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  NONE: { label: 'Not verified', className: 'bg-muted text-muted-foreground' },
  PENDING: { label: 'Under review', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  APPROVED: { label: 'Verified ✓', className: 'bg-green-500/15 text-green-700 dark:text-green-300' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
}

export function KycCard() {
  const [kyc, setKyc] = useState<KycState | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [cnic, setCnic] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [documentImage, setDocumentImage] = useState('')
  const [selfieImage, setSelfieImage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.getMyKyc()
      setKyc(
        d.kyc
          ? { status: d.kyc.status, fullName: d.kyc.fullName, city: d.kyc.city, adminNote: d.kyc.adminNote }
          : { status: 'NONE' }
      )
      if (d.kyc) {
        setFullName(d.kyc.fullName)
        setCity(d.kyc.city)
      }
    } catch {
      setKyc({ status: 'NONE' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function pick(file: File | undefined, setter: (v: string) => void) {
    if (!file) return
    try {
      setter(await fileToCompactDataUrl(file))
    } catch (e) {
      toast.error('Could not read image', { description: errorMessage(e) })
    }
  }

  async function submit() {
    setBusy(true)
    try {
      await api.submitKyc({ fullName: fullName.trim(), cnic: cnic.trim(), phone: phone.trim(), city: city.trim(), documentImage, selfieImage: selfieImage || undefined })
      toast.success('KYC submitted', { description: 'The platform team will verify your documents shortly.' })
      setDocumentImage('')
      setSelfieImage('')
      setCnic('')
      setPhone('')
      await load()
    } catch (e) {
      toast.error('Could not submit KYC', { description: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <FbCard className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading verification status…
        </div>
      </FbCard>
    )
  }

  const status = kyc?.status ?? 'NONE'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.NONE

  return (
    <FbCard className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-blue-500/15">
          {status === 'APPROVED' ? <BadgeCheck className="size-5 text-[#1877F2]" /> : <IdCard className="size-5 text-[#1877F2]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Teacher Verification (KYC)</p>
          <p className="text-xs text-muted-foreground">Verify your identity with your CNIC — verified teachers get a badge and trust.</p>
        </div>
        <Badge className={cn('border-transparent font-bold', badge.className)}>{badge.label}</Badge>
      </div>

      {status === 'PENDING' ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/70 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-500" />
          Your documents are under review{city ? ` (${city})` : ''}. We usually verify within 24 hours.
        </p>
      ) : status === 'APPROVED' ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-green-500/5 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-600" />
          You are verified{fullName ? ` as ${fullName}` : ''} — the blue badge shows on your profile and listings.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {status === 'REJECTED' ? (
            <p className="flex items-start gap-2 rounded-lg bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-400">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              Previous submission rejected{kyc?.adminNote ? `: “${kyc.adminNote}”` : ''} — you can resubmit below.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="kyc-name">Full name (as on CNIC)</Label>
              <Input id="kyc-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ahmed Raza" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="kyc-cnic">CNIC number</Label>
              <Input id="kyc-cnic" value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-XXXXXXX-X" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="kyc-phone">Phone</Label>
              <Input id="kyc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 3XX XXXXXXX" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="kyc-city">City</Label>
              <Input id="kyc-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lahore" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed p-4 text-center text-muted-foreground transition-colors hover:bg-muted">
              {documentImage ? (
                <img src={documentImage} alt="ID document attached" className="h-16 w-full rounded object-cover" />
              ) : (
                <>
                  <Upload className="size-5" />
                  <span className="text-xs font-medium">CNIC / ID document photo *</span>
                </>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0], setDocumentImage)} />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed p-4 text-center text-muted-foreground transition-colors hover:bg-muted">
              {selfieImage ? (
                <img src={selfieImage} alt="Selfie attached" className="h-16 w-full rounded object-cover" />
              ) : (
                <>
                  <Camera className="size-5" />
                  <span className="text-xs font-medium">Selfie holding CNIC (optional)</span>
                </>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0], setSelfieImage)} />
            </label>
          </div>

          <Button
            onClick={() => void submit()}
            disabled={busy || !fullName.trim() || !cnic.trim() || !phone.trim() || !city.trim() || !documentImage}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {busy ? 'Submitting…' : 'Submit for verification'}
          </Button>
        </div>
      )}
    </FbCard>
  )
}
