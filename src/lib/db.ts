import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Hardcoded absolute path to avoid environment variable issues
const resolvedDbPath = 'C:\\Users\\Shoaib Ali\\Downloads\\studysir\\db\\custom.db'
const finalUrl = `file:${resolvedDbPath}`

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: finalUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db