import { randomInt } from 'crypto'
import { insforge } from '@/lib/insforge'

export const EMAIL_CODE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export function generateEmailCode(): string {
  return String(randomInt(100000, 1000000))
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const html = [
    '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827">',
    '<h1 style="font-size:20px;color:#1877F2">Verify your StudySir email</h1>',
    '<p>Your verification code is:</p>',
    '<p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#1877F2;margin:16px 0">' + code + '</p>',
    '<p style="color:#6b7280;font-size:14px">This code expires in 15 minutes. If you did not create this account, you can ignore this email.</p>',
    '</div>',
  ].join('')

  await insforge.sendEmail(to, 'Verify your StudySir email', html)
}
