import { randomInt } from 'crypto'

export const EMAIL_CODE_TTL_MS = 15 * 60 * 1000 // 15 minutes

export function generateEmailCode(): string {
  return String(randomInt(100000, 1000000))
}

/**
 * Local development email sender.
 * The production version used the InsForge SMTP service; in this local sandbox
 * we just log the code so it can be read from the server logs (demo convenience).
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  console.log(`[email] (local) To: ${to} | StudySir verification code: ${code}`)
}
