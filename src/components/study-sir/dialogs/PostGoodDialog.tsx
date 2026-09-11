'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const valid = title.trim().length > 2 && description.trim().length > 2 && (Number(price) || 0) > 0

  async function pickImage(file: File | undefined) {
    if (!file || uploading) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file')
      return
    }
    setUploading(true)
    try {
      const compressed = await compressImageFile(file)
      const { url } = await api.uploadImage('goods', compressed)
      setImage(url)
      toast.success('Image uploaded')
    } catch (e) {
      toast.error('Could not upload image', { description: errorMessage(e) })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sell an Item</DialogTitle>
          <DialogDescription>List a digital study material in the store.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="good-title">Title *</Label>
            <Input id="good-title" placeholder="e.g. Class 10 Math Formula Sheet (PDF)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="good-desc">Description *</Label>
            <Textarea id="good-desc" placeholder="What's inside? Format? How is it delivered?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label>Image</Label>
            {image ? (
              <div className="relative overflow-hidden rounded-lg border">
                <SafeImage src={image} alt="item" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => setImage('')}
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-28 items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-[#1877F2] hover:text-[#1877F2] disabled:opacity-60"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
            )}
            {image ? (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                Change image
              </Button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                void pickImage(file)
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="good-price">Price (Rs) *</Label>
            <Input id="good-price" type="number" min={0} placeholder="300" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || loading}>
            {loading ? 'Listing…' : 'List Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
