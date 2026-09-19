/**
 * Staff permission system for StudySir admin.
 *
 * The OWNER (subRole = 'OWNER') has full access to every module.
 * A STAFF account (subRole = 'STAFF') has a custom set of allowed modules
 * stored as a JSON array in the `permissions` field on User.
 *
 * The owner can grant a staff member access to any combination of modules —
 * "jitni chahe access de sakta hai jitne modules ki chahe customized access".
 */

export type AdminModule =
  | 'overview'
  | 'users'
  | 'reports'
  | 'payments'
  | 'kyc'
  | 'economy'
  | 'ai'
  | 'analytics'
  | 'moderation'
  | 'staff'
  | 'plans'
  | 'withdrawals'
  | 'bank-accounts'
  | 'settings'

export const ALL_ADMIN_MODULES: AdminModule[] = [
  'overview',
  'users',
  'reports',
  'payments',
  'kyc',
  'economy',
  'ai',
  'analytics',
  'moderation',
  'staff',
  'plans',
  'withdrawals',
  'bank-accounts',
  'settings',
]

export const MODULE_META: Record<AdminModule, { label: string; description: string }> = {
  overview: { label: 'Overview', description: 'Dashboard KPIs, queues, recent activity' },
  users: { label: 'Users', description: 'Search, review, ban/unban accounts' },
  reports: { label: 'Reports', description: 'User-subplied reports & moderation' },
  moderation: { label: 'Content Moderation', description: 'Auto-flagged links & contact info' },
  payments: { label: 'Payments', description: 'Verify top-up payment proofs' },
  withdrawals: { label: 'Withdrawals', description: 'Process money-wallet withdrawal requests' },
  kyc: { label: 'KYC', description: 'Verify teacher identity documents' },
  plans: { label: 'Premium Plans', description: 'Approve/reject teacher plan purchases' },
  'bank-accounts': { label: 'Bank Accounts', description: 'Manage platform payment accounts' },
  economy: { label: 'Economy', description: 'Currency rates, commission, milestone' },
  ai: { label: 'AI Engine', description: 'AI agents, personas, wasted-coin tracking' },
  analytics: { label: 'Analytics', description: 'Platform growth analytics' },
  staff: { label: 'Staff Management', description: 'Add/edit staff & their module access' },
  settings: { label: 'Platform Settings', description: 'Commission rate & milestone' },
}

/** Parse a user's permissions JSON. Returns null for owner (full access). */
export function parsePermissions(permissions: string | null | undefined): AdminModule[] | null {
  if (!permissions) return null
  try {
    const arr = JSON.parse(permissions)
    if (!Array.isArray(arr)) return null
    const valid = new Set<string>(ALL_ADMIN_MODULES)
    return arr.filter((m) => typeof m === 'string' && valid.has(m)) as AdminModule[]
  } catch {
    return null
  }
}

export function hasModuleAccess(user: {
  isAdmin: boolean
  subRole?: string | null
  permissions?: string | null
}, module: AdminModule): boolean {
  if (!user?.isAdmin) return false
  if (!user.subRole || user.subRole === 'OWNER') return true // owner = full access
  const allowed = parsePermissions(user.permissions)
  if (!allowed) return false
  return allowed.includes(module)
}

/** Modules a given admin user may access (ALL for owner, custom subset for staff). */
export function accessibleModules(user: {
  isAdmin: boolean
  subRole?: string | null
  permissions?: string | null
}): AdminModule[] {
  if (!user?.isAdmin) return []
  if (!user.subRole || user.subRole === 'OWNER') return ALL_ADMIN_MODULES
  return parsePermissions(user.permissions) ?? []
}
