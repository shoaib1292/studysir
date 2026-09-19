/**
 * SQLite to PostgreSQL Migration Script for InsForge
 *
 * This script migrates all data from the local SQLite database (db/custom.db)
 * to the InsForge PostgreSQL database.
 *
 * Prerequisites:
 * 1. Ensure DATABASE_URL is set in .env
 * 2. Run: npx prisma db push (to create schema in PostgreSQL)
 * 3. Run: npx tsx scripts/migrate-to-insforge.ts
 *
 * Note: This script reads the SQLite file directly using sql.js (pure JS)
 * to avoid native compilation issues.
 */

import { PrismaClient } from '@prisma/client'
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

// SQLite source
const SQLITE_PATH = path.join(process.cwd(), 'db', 'custom.db')

// PostgreSQL target (from env or default)
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/insforge?schema=public'

interface TableStats {
  table: string
  sqliteCount: number
  pgCount: number
  status: 'success' | 'skipped' | 'error'
  error?: string
}

// Helper to convert SQLite boolean values
function convertValue(key: string, value: any): any {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && (
    key.startsWith('is') ||
    key === 'hidden' ||
    key === 'active' ||
    key === 'refunded' ||
    key === 'system' ||
    key === 'forwarded' ||
    key === 'read'
  )) {
    return value === 1
  }
  return value
}

// Helper to map SQLite row to Prisma model
function mapRowToModel(tableName: string, row: Record<string, any>): any {
  const mapped: any = {}
  for (const [key, value] of Object.entries(row)) {
    mapped[key] = convertValue(key, value)
  }
  return mapped
}

async function migrate() {
  console.log('🚀 Starting SQLite → PostgreSQL migration for InsForge')
  console.log(`📍 SQLite: ${SQLITE_PATH}`)
  console.log(`📍 PostgreSQL: ${DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`)
  console.log()

  // Initialize sql.js (pure JavaScript SQLite)
  const SQL = await initSqlJs()

  // Load SQLite database
  const dbBuffer = fs.readFileSync(SQLITE_PATH)
  const sqlite = new SQL.Database(dbBuffer)

  // Initialize Prisma client for PostgreSQL
  const pg = new PrismaClient({
    datasources: { db: { url: DATABASE_URL } }
  })

  const stats: TableStats[] = []

  try {
    // Get all tables from SQLite
    const tablesResult = sqlite.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'"
    )

    if (!tablesResult.length) {
      console.error('No tables found in SQLite database')
      process.exit(1)
    }

    const sqliteTables = tablesResult[0].values.map(row => row[0] as string)
    console.log(`Found ${sqliteTables.length} tables in SQLite:`)
    sqliteTables.forEach(t => console.log(`  - ${t}`))
    console.log()

    // Migration order (respecting foreign key dependencies)
    const migrationOrder = [
      'User',
      'ExchangeRate',
      'PlatformSetting',
      'PlatformBankAccount',
      'TuitionPost',
      'Course',
      'DigitalGood',
      'Connection',
      'Message',
      'Reaction',
      'CoinTransaction',
      'Block',
      'Review',
      'Like',
      'Notification',
      'Availability',
      'Purchase',
      'WithdrawRequest',
      'KycSubmission',
      'TopUpRequest',
      'Save',
      'Report',
      'SharedPost',
      'PlanPurchase',
      'AffiliateEarning'
    ]

    for (const tableName of migrationOrder) {
      const stat: TableStats = {
        table: tableName,
        sqliteCount: 0,
        pgCount: 0,
        status: 'success'
      }

      try {
        // Get data from SQLite
        const result = sqlite.exec(`SELECT * FROM "${tableName}"`)
        if (!result.length || !result[0].values.length) {
          stat.status = 'skipped'
          console.log(`⏭️  ${tableName}: No data`)
          stats.push(stat)
          continue
        }

        const columns = result[0].values[0] as unknown as string[] // Not used, get from columns array
        const colNames = result[0].columns || []
        const rows = result[0].values as any[][]

        stat.sqliteCount = rows.length

        // Convert rows to objects
        const dataToInsert = rows.map(row => {
          const obj: any = {}
          colNames.forEach((col, idx) => {
            obj[col] = convertValue(col, row[idx])
          })
          return obj
        })

        // Get Prisma model
        const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1)
        const pgModel = (pg as any)[modelName]

        if (!pgModel || !pgModel.createMany) {
          stat.status = 'skipped'
          stat.error = 'No Prisma model or createMany not available'
          console.log(`⚠️  ${tableName}: Skipped (no Prisma model)`)
          stats.push(stat)
          continue
        }

        // Insert in batches of 100
        const batchSize = 100
        for (let i = 0; i < dataToInsert.length; i += batchSize) {
          const batch = dataToInsert.slice(i, i + batchSize)
          try {
            await pgModel.createMany({
              data: batch,
              skipDuplicates: true
            })
          } catch (batchErr: any) {
            // Try inserting one by one if batch fails
            for (const item of batch) {
              try {
                await pgModel.create({ data: item })
              } catch (itemErr: any) {
                // Skip duplicates
                if (!itemErr.message?.includes('Unique constraint')) {
                  throw itemErr
                }
              }
            }
          }
        }

        // Verify count
        const pgCount = await pgModel.count()
        stat.pgCount = pgCount

        console.log(`✅ ${tableName}: ${rows.length} rows migrated`)
      } catch (err: any) {
        stat.status = 'error'
        stat.error = err.message
        console.log(`❌ ${tableName}: ${err.message}`)
      }

      stats.push(stat)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('MIGRATION SUMMARY')
    console.log('='.repeat(60))

    const totalSqlite = stats.reduce((sum, s) => sum + s.sqliteCount, 0)
    const totalPg = stats.reduce((sum, s) => sum + s.pgCount, 0)
    const errors = stats.filter(s => s.status === 'error')

    console.log(`Total SQLite rows: ${totalSqlite}`)
    console.log(`Total PostgreSQL rows: ${totalPg}`)
    console.log(`Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\nFailed tables:')
      errors.forEach(e => console.log(`  - ${e.table}: ${e.error}`))
    }

    console.log('\n🎉 Migration complete!')
    console.log('\nNext steps:')
    console.log('1. Verify data in PostgreSQL: npx prisma studio')
    console.log('2. Update your app to use the new DATABASE_URL')
    console.log('3. Deploy with InsForge!')

  } catch (err: any) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    sqlite.close()
    await pg.$disconnect()
  }
}

migrate()
