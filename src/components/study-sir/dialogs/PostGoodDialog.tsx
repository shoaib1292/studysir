'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, FileUp, ImagePlus, Link, Loader2, X } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { api, errorMessage } from '@/lib/api'
import { compressImageFile } from '@/lib/image'
import { SafeImage } from '../shared/SafeImage'
import { cn } from '@/lib/utils'

type AssetMode = 'file' | 'link'

export function PostGoodDialog({
  open,
  onOpenChange,
  onPosted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPosted: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<string>('')
  const [price, setPrice] = useState('')

  const [assetMode, setAssetMode] = useState<AssetMode>('file')
  const [assetFile, setAssetFile] = useState<string>('')
  const [assetName, setAssetName] = useState('')
  const [accessLink, setAccessLink] = useState('')

  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const [loading, setLoading] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const assetInputRef = useRef<HTMLInputElement>(null)

  const uploading = uploadingImage || uploadingAsset
  const assetReady = assetMode === 'file' ? Boolean(assetFile) : accessLink.trim().length > 4
  const valid = title.trim().length > 2 && description.trim().length > 2 && (Number(price) || 0) > 0 && assetReady

  async function pickImage(file: File | undefined) {
    if (!file || uploadingImage) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file')
      return
    }
    setUploadingImage(true)
    try {
      const compressed = await compressImageFile(file)
      const { url } = await api.uploadImage('goods', compressed)
      setImage(url)
      toast.success('Cover image uploaded')
    } catch (e) {
      toast.error('Could not upload image', { description: errorMessage(e) })
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  async function pickAsset(file: File | undefined) {
    if (!file || uploadingAsset) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File is too large', { description: 'Max 50MB per digital asset.' })
      return
    }
    setUploadingAsset(true)
    try {
      const { url } = await api.uploadAsset(file)
      setAssetFile(url)
      setAssetName(file.name)
      toast.success('Asset uploaded')
    } catch (e) {
      toast.error('Could not upload asset', { description: errorMessage(e) })
    } finally {
      setUploadingAsset(false)
      if (assetInputRef.current) assetInputRef.current.value = ''
    }
  }

  async function submit() {
    if (!valid || loading) return
    setLoading(true)
    try {
      await api.createGood({
        title: title.trim(),
        description: description.trim(),
        image: image || undefined,
        assetType: assetMode,
        accessLink: assetMode === 'link' ? accessLink.trim() : undefined,
        fileUrl: assetMode === 'file' ? assetFile : undefined,
        price: Number(price) || 0,
      })
      toast.success('Item listed!', { description: 'Your digital item is now in the store.' })
      onOpenChange(false)
      onPosted()
      reset()
    } catch (e) {
      toast.error('Could not list item', { description: errorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setTitle('')
    setDescription('')
    setImage('')
    setPrice('')
    setAssetFile('')
    setAssetName('')
    setAccessLink('')
    setAssetMode('file')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sell a Digital Item</DialogTitle>
          <DialogDescription>Upload a file buyers can download, or share an access link.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Cover image */}
          <div className="grid gap-1.5">
            <Label>Cover image</Label>
            {image ? (
              <div className="relative overflow-hidden rounded-lg border">
                <SafeImage src={image} alt="cover" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove cover"
                  onClick={() => setImage('')}
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex h-28 items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-[#1877F2] hover:text-[#1877F2] disabled:opacity-60"
              >
                {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploadingImage ? 'Uploading…' : 'Add cover image'}
              </button>
            )}
            {image ? (
              <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
                Change
              </Button>
            ) : null}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                void pickImage(file)
              }}
            />
          </div>

          {/* Title + description + price */}
          <div className="grid gap-1.5">
            <Label htmlFor="good-title">Title *</Label>
            <Input id="good-title" placeholder="e.g. Class 10 Math Formula Sheet (PDF)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="good-desc">Description *</Label>
            <Textarea id="good-desc" placeholder="What's inside? Format? How is it delivered?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="good-price">Price (Rs) *</Label>
            <Input id="good-price" type="number" min={0} placeholder="300" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          {/* Digital asset: file OR link */}
          <div className="grid gap-2 rounded-xl border bg-muted/30 p-3">
            <Label className="text-sm font-semibold text-foreground">Digital asset *</Label>
            <p className="text-xs text-muted-foreground">Buyers get this after purchase.</p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssetMode('file')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all',
                  assetMode === 'file' ? 'border-[#1877F2] bg-[#1877F2]/5 text-[#1877F2]' : 'border-transparent bg-card hover:border-muted-foreground/30'
                )}
              >
                <FileUp className="size-4" />
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setAssetMode('link')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all',
                  assetMode === 'link' ? 'border-[#1877F2] bg-[#1877F2]/5 text-[#1877F2]' : 'border-transparent bg-card hover:border-muted-foreground/30'
                )}
              >
                <Link className="size-4" />
                Access link
              </button>
            </div>

            {assetMode === 'file' ? (
              <div className="grid gap-1.5">
                {assetFile ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                    <FileUp className="size-8 shrink-0 rounded bg-blue-500/10 p-1.5 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{assetName || 'Uploaded asset'}</p>
                      <p className="text-xs text-green-600">Ready — buyers can download this file</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove asset"
                      onClick={() => {
                        setAssetFile('')
                        setAssetName('')
                      }}
                      className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => assetInputRef.current?.click()}
                    disabled={uploadingAsset}
                    className="flex h-24 items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-[#1877F2] hover:text-[#1877F2] disabled:opacity-60"
                  >
                    {uploadingAsset ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                    {uploadingAsset ? 'Uploading…' : 'Upload file (PDF, ZIP, DOC…)'}
                  </button>
                )}
                <input
                  ref={assetInputRef}
                  type="file"
                  accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.mp4,.mp3"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    void pickAsset(file)
                  }}
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="good-link">Access / download link *</Label>
                <div className="relative">
                  <ExternalLink className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="good-link"
                    type="url"
                    placeholder="https://drive.google.com/… or any link"
                    value={accessLink}
                    onChange={(e) => setAccessLink(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Buyers will be redirected here after purchase.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || loading || uploading}>
            {loading ? 'Listing…' : 'List Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
