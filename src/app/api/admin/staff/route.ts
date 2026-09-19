import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser } from '@/lib/session'
import { hasModuleAccess, ALL_ADMIN_MODULES, parsePermissions } from '@/lib/permissions'
import { hashPassword } from '@/lib/password'
import { toUserDTO } from '@/lib/dto'

/**
 * GET /api/admin/staff — list all platform staff accounts (isAdmin=true).
 * Owner sees everyone; staff with the 'staff' module sees everyone too (so they
 * can't edit owners, but they can view — see [id] route for edit restrictions).
 */
export async function GET() {
  try {
    const admin = await requireAdminUser()
    if (!hasModuleAccess(admin, 'staff')) {
      return NextResponse.json({ error: 'No access to staff management' }, { status: 403 })
    }

    const staff = await db.user.findMany({
      where: { isAdmin: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        subRole: true,
        permissions: true,
        staffCreatedBy: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      staff: staff.map((s) => ({
        ...s,
        permissions: parsePermissions(s.permissions),
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/staff — create a new staff account with custom module access.
 * Body: { name, email, password, permissions: AdminModule[] }
 * Only the OWNER can create staff accounts.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser({ ownerOnly: true })
    void admin
    const body = await req.json().catch(() => ({}))
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const perms = Array.isArray(body.permissions) ? body.permissions : []

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Validate permissions — only known modules, dedupe.
    const valid = new Set<string>(ALL_ADMIN_MODULES as unknown as string[])
    const cleanPerms = Array.from(new Set(perms.filter((m: unknown) => typeof m === 'string' && valid.has(m as string)))) as string[]
    if (cleanPerms.length === 0) {
      return NextResponse.json({ error: 'Select at least one module for the staff account' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

    const staff = await db.user.create({
      data: {
        name,
        email,
        password: hashPassword(password),
        role: 'STUDENT',
        isAdmin: true,
        subRole: 'STAFF',
        permissions: JSON.stringify(cleanPerms),
        staffCreatedBy: admin.id,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({ user: toUserDTO(staff) }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
