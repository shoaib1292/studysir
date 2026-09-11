import { NextRequest, NextResponse } from 'next/server'
import { requireSessionUser, HttpError } from '@/lib/session'
import { insforge } from '@/lib/insforge'

const ALLOWED_BUCKETS = ['avatars', 'covers', 'goods', 'course-covers', 'chat-images', 'tuition-images']

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

export async function POST(req: NextRequest) {
  try {
    await requireSessionUser()

    const form = await req.formData().catch(() => null)
    if (!form) throw new HttpError(400, 'Expected multipart form data')

    const file = form.get('file')
    const bucket = (form.get('bucket') as string) || 'avatars'

    if (!(file instanceof Blob)) throw new HttpError(400, 'No file provided')
    if (!file.type.startsWith('image/')) throw new HttpError(400, 'Only images are allowed')
    if (!ALLOWED_BUCKETS.includes(bucket)) throw new HttpError(400, 'Invalid upload bucket')

    const name = typeof (file as { name?: string }).name === 'string' ? (file as { name: string }).name : 'image'
    const key = `${Date.now()}-${crypto.randomUUID()}${extFor(file.type, name)}`
    const { url } = await insforge.uploadFile(bucket, key, file)

    return NextResponse.json({ url, key, bucket })
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[upload]', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
