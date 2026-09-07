// Client-side image helpers for chat photo attachments.
// Downscales to <= 1280px on the long edge and re-encodes as JPEG until the
// data URL fits comfortably in the API limit (700k chars ≈ 500KB binary).

const MAX_DIM = 1280
const TARGET_CHARS = 650_000

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
