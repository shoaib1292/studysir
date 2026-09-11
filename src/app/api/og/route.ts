import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

// Minimal text → SVG line wrapper so long titles stay inside the card.
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3)
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Dynamic branded OpenGraph image (1200×630) so shared links always show a clean
 * StudySir card even when the post has no photo. Generated with sharp from an SVG
 * template — no static image files needed.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = (searchParams.get('title') || 'StudySir').slice(0, 90)
  const price = (searchParams.get('price') || '').slice(0, 40)
  const type = (searchParams.get('type') || '').slice(0, 20)

  const W = 1200
  const H = 630
  const lines = wrap(title, 34)
  const titleY = 250 - (lines.length - 1) * 34
  const titleSvg = lines
    .map((l, i) => `<text x="80" y="${titleY + i * 68}" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${escapeXml(l)}</text>`)
    .join('')

  const chip = type
    ? `<rect x="80" y="360" rx="28" ry="28" height="52" fill="rgba(255,255,255,0.18)"/>
       <text x="104" y="393" font-family="Arial, sans-serif" font-size="26" font-weight="600" fill="#ffffff">${escapeXml(type)}</text>`
    : ''
  const priceSvg = price
    ? `<text x="${type ? 80 + 48 + 220 : 80}" y="393" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#fde68a">${escapeXml(price)}</text>`
    : ''

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#166fe5"/>
        <stop offset="1" stop-color="#0b2f6b"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="1040" cy="120" r="220" fill="rgba(255,255,255,0.06)"/>
    <circle cx="1120" cy="520" r="160" fill="rgba(255,255,255,0.05)"/>
    <text x="80" y="120" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="#ffffff">StudySir</text>
    <text x="80" y="158" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.75)">Connecting Students &amp; Teachers</text>
    ${titleSvg}
    ${chip}
    ${priceSvg}
    <rect x="80" y="${H - 70}" width="200" height="6" rx="3" fill="rgba(255,255,255,0.4)"/>
  </svg>`

  const png = await sharp(Buffer.from(svg)).png().toBuffer()

  return new NextResponse(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
