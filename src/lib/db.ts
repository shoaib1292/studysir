import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// InsForge PostgreSQL connection - uses DATABASE_URL from environment
// Falls back to local development connection if not set
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insforge?schema=public'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db