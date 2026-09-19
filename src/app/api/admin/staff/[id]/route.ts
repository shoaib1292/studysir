import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminUser } from '@/lib/session'
import { hasModuleAccess, ALL_ADMIN_MODULES, parsePermissions } from '@/lib/permissions'
import { hashPassword } from '@/lib/password'

/**
 * PATCH /api/admin/staff/[id] — update a staff account.
 * Body (any subset): { name?, permissions?, status?, password? }
 *  - Owner can edit any staff account.
 *  - A staff-with-'staff'-module can edit only non-owner staff accounts, and
 *    cannot grant the 'staff' module or promote to OWNER.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser()
    if (!hasModuleAccess(admin, 'staff')) {
      return NextResponse.json({ error: 'No access to staff management' }, { status: 403 })
    }
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))

    const target = await db.user.findUnique({ where: { id } })
    if (!target || !target.isAdmin) {
      return NextResponse.json({ error: 'Staff account not found' }, { status: 404 })
    }

    const isOwnerAdmin = !admin.subRole || admin.subRole === 'OWNER'
    const targetIsOwner = !target.subRole || target.subRole === 'OWNER'
    // Non-owners cannot touch owner accounts or change ownership-level fields.
    if (!isOwnerAdmin && targetIsOwner) {
      return NextResponse.json({ error: 'You cannot edit an owner account' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.status === 'string' && ['ACTIVE', 'BANNED'].includes(body.status)) data.status = body.status

    if (Array.isArray(body.permissions)) {
      const valid = new Set<string>(ALL_ADMIN_MODULES as unknown as string[])
      let cleanPerms = Array.from(new Set(body.permissions.filter((m: unknown) => typeof m === 'string' && valid.has(m as string)))) as string[]
      if (cleanPerms.length === 0) {
        return NextResponse.json({ error: 'Select at least one module' }, { status: 400 })
      }
      // Non-owners cannot grant the 'staff' module (would let them create more staff).
      if (!isOwnerAdmin) cleanPerms = cleanPerms.filter((m) => m !== 'staff')
      data.permissions = JSON.stringify(cleanPerms)
    }

    if (typeof body.password === 'string' && body.password.length >= 6) {
      data.password = hashPassword(body.password)
    }

    const updated = await db.user.update({ where: { id }, data })
    return NextResponse.json({
      user: { id: updated.id, name: updated.name, email: updated.email, permissions: parsePermissions(updated.permissions), status: updated.status },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/staff/[id] — remove a staff account (revoke admin access).
 * Cannot delete the OWNER. Soft approach: set isAdmin=false (keeps the user row
 * so their feed history is intact) rather than hard-delete.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser({ ownerOnly: true })
    void admin
    const { id } = await ctx.params
    const target = await db.user.findUnique({ where: { id } })
    if (!target || !target.isAdmin) {
      return NextResponse.json({ error: 'Staff account not found' }, { status: 404 })
    }
    if (!target.subRole || target.subRole === 'OWNER') {
      return NextResponse.json({ error: 'The owner account cannot be removed' }, { status: 403 })
    }
    if (target.id === admin.id) {
      return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 403 })
    }

    await db.user.update({
      where: { id },
      data: { isAdmin: false, subRole: null, permissions: null, staffCreatedBy: null },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
