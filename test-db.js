const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function test() {
  try {
    const users = await db.user.findMany({ take: 3 })
    console.log('Users found:', users.length)
    console.log(users)
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await db.$disconnect()
  }
}

test()
