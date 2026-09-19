// Client-side image helpers.
// - fileToCompactDataUrl: chat attachments (data URL under the API char limit).
// - compressImageFile: uploads — downscale + JPEG so storage stays small without
//   visible quality loss (sharp on the server can re-encode, but most of the win
//   is shrinking before it ever hits the network).

const MAX_DIM = 1280
const TARGET_CHARS = 650_000
const UPLOAD_MAX_DIM = 1280
const UPLOAD_JPEG_QUALITY = 0.85
const UPLOAD_MAX_FILE_BYTES = 300 * 1024 // pass through if already small enough

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Unsupported image file'))
    img.src = src
  })
}

/** Downscale + re-encode a picked image file to a compact JPEG data URL. */
export async function fileToCompactDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please pick an image file')

  const raw = await readFile(file)
  let img: HTMLImageElement
  try {
    img = await loadImage(raw)
  } catch {
    // Not decodable by canvas (e.g. some HEICs) — fall back to raw data URL if small enough
    if (raw.length <= TARGET_CHARS) return raw
    throw new Error('Image could not be processed — try a JPG or PNG')
  }

  // Never upscale
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw
  ctx.drawImage(img, 0, 0, w, h)

  let quality = 0.82
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > TARGET_CHARS && quality > 0.4) {
    quality -= 0.12
    out = canvas.toDataURL('image/jpeg', quality)
  }
  return out
}

/** Pick the output MIME: keep PNG only for images with real transparency. */
function chooseOutType(file: File, hasAlpha: boolean): string {
  if (file.type === 'image/png' && hasAlpha) return 'image/png'
  if (file.type === 'image/webp' && hasAlpha) return 'image/webp'
  return 'image/jpeg'
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const { data } = ctx.getImageData(0, 0, w, h)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

/**
 * Compress a picked image file for storage without visible quality loss:
 * downscale to <= UPLOAD_MAX_DIM on the long edge, re-encode (JPEG by default),
 * and drop the quality in small steps until it is comfortably under ~600KB.
 * Already-small files pass straight through.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please pick an image file')
  if (file.size <= UPLOAD_MAX_FILE_BYTES) return file

  const raw = await readFile(file)
  let img: HTMLImageElement
  try {
    img = await loadImage(raw)
  } catch {
    return file // not decodable by canvas — fall back to the original
  }

  const scale = Math.min(1, UPLOAD_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return file

  const alpha = file.type === 'image/png' || file.type === 'image/webp'
  if (!alpha) ctx.fillRect(0, 0, w, h) // JPEG has no alpha — fill white so odd edges don't go black
  ctx.drawImage(img, 0, 0, w, h)

  const transparent = alpha && hasTransparency(ctx, w, h)
  const type = chooseOutType(file, transparent)
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'

  let quality = UPLOAD_JPEG_QUALITY
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

  // For JPEG/WebP, step the quality down until the payload is small enough.
  if (type !== 'image/png') {
    let guard = 0
    while (blob && blob.size > 600_000 && quality > 0.5 && guard < 6) {
      quality -= 0.08
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
      guard++
    }
  }

  if (!blob) return file
  if (blob.size >= file.size) return file // never ship a "compressed" blob bigger than the source

  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${ext}`, { type })
}
