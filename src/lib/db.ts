import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// SQLite database — uses DATABASE_URL from environment (file: based)
const databaseUrl = process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db'

/**
 * Detect a stale cached Prisma client (e.g. the schema was updated and
 * `prisma generate`/`db:push` ran AFTER the dev server started, so the cached
 * instance is missing newer models like `comment` / `moderationItem`). In dev
 * we throw the stale instance away and create a fresh one so the new schema
 * is honoured without needing a manual dev-server restart.
 */
function isStalePrisma(client: PrismaClient | undefined): boolean {
  if (!client) return true
  // newer models added after the original clone — if the cached client was
  // built from an older schema, these accessors are missing.
  return (
    typeof (client as unknown as { comment?: unknown }).comment !== 'object' ||
    typeof (client as unknown as { moderationItem?: unknown }).moderationItem !== 'object'
  )
}

export const db =
  isStalePrisma(globalForPrisma.prisma)
    ? new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      })
    : globalForPrisma.prisma!

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
