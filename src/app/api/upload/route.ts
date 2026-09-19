import { NextRequest, NextResponse } from 'next/server'
import { requireSessionUser, HttpError } from '@/lib/session'
import sharp from 'sharp'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const ALLOWED_BUCKETS = ['avatars', 'covers', 'goods', 'course-covers', 'chat-images', 'tuition-images', 'digital-assets']

// Server-side safety net: always store a downscaled, re-encoded image so a huge
// upload can never bloat storage even if the client skipped compression.
const STORAGE_MAX_DIM = 1600

// Digital assets (PDFs, ZIPs, etc.) are stored as-is — no image processing.
const ASSET_BUCKET = 'digital-assets'

function extFor(type: string, name: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  if (map[type]) return map[type]
  const match = /\.[a-z0-9]{2,5}$/i.exec(name)
  return match ? match[0].toLowerCase() : '.jpg'
}

/**
 * Local file storage fallback.
 * Files are written to /public/uploads/<bucket>/<key> and served via /uploads/<bucket>/<key>.
 * This replaces the InsForge storage service so uploads work without an external bucket.
 */
async function saveLocal(bucket: string, key: string, body: Blob): Promise<{ url: string; key: string; bucket: string }> {
  const dir = path.join(process.cwd(), 'public', 'uploads', bucket)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, key)
  const buffer = Buffer.from(await body.arrayBuffer())
  await writeFile(filePath, buffer)
  return { url: `/uploads/${bucket}/${key}`, key, bucket }
}

export async function POST(req: NextRequest) {
  try {
    await requireSessionUser()

    const form = await req.formData().catch(() => null)
    if (!form) throw new HttpError(400, 'Expected multipart form data')

    const file = form.get('file')
    const bucket = (form.get('bucket') as string) || 'avatars'

    if (!(file instanceof Blob)) throw new HttpError(400, 'No file provided')
    if (!ALLOWED_BUCKETS.includes(bucket)) throw new HttpError(400, 'Invalid upload bucket')

    const isAsset = bucket === ASSET_BUCKET
    if (!isAsset && !file.type.startsWith('image/')) throw new HttpError(400, 'Only images are allowed')

    const name = typeof (file as { name?: string }).name === 'string' ? (file as { name: string }).name : isAsset ? 'asset' : 'image'

    let key: string
    let body: Blob

    if (isAsset) {
      // Digital asset: keep original bytes, just give it a safe unique key.
      const ext = (/\.[a-z0-9]{1,8}$/i.exec(name)?.[0] || '').toLowerCase()
      key = `${Date.now()}-${crypto.randomUUID()}${ext}`
      body = file as Blob
    } else {
      const input = new Uint8Array(await (file as Blob).arrayBuffer())
      const pipeline = sharp(input).rotate().resize({ width: STORAGE_MAX_DIM, height: STORAGE_MAX_DIM, fit: 'inside', withoutEnlargement: true })
      let out: Buffer
      let outExt: string
      if (file.type === 'image/png') {
        out = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
        outExt = '.png'
      } else if (file.type === 'image/webp') {
        out = await pipeline.webp({ quality: 85 }).toBuffer()
        outExt = '.webp'
      } else {
        out = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer()
        outExt = '.jpg'
      }
      key = `${Date.now()}-${crypto.randomUUID()}${outExt}`
      body = new Blob([out as unknown as BlobPart], { type: file.type })
    }

    const { url } = await saveLocal(bucket, key, body)

    return NextResponse.json({ url, key, bucket })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[upload]', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
