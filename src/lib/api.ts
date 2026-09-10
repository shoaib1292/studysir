// Typed fetch helpers for the StudySir API.
// Always sends cookies (credentials: 'include'), always relative URLs.
import type {
  AdminAnalytics,
  AdminOverview,
  AdminSettingsDTO,
  AdminStats,
  AdminUserDTO,
  AiAgentDTO,
  AvailabilityDTO,
  BankAccountDTO,
  CoinTransactionDTO,
  ConnectionDTO,
  CourseDTO,
  FeedItem,
  GoodDTO,
  KycDTO,
  MessageDTO,
  MessageReactionGroup,
  NotificationDTO,
  PlanDTO,
  PlanPurchaseDTO,
  PlanTier,
  ProfileStats,
  AffiliateDTO,
  RateDTO,
  ReportDTO,
  ReviewDTO,
  StudentDTO,
  ThreadResponse,
  TopUpDTO,
  TopUpKind,
  TuitionPostDTO,
  UserDTO,
  WalletResponse,
  WithdrawalDTO,
} from '@/lib/types'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const init: RequestInit = { credentials: 'include' }
  if (options.method) init.method = options.method
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(options.body)
  }

  let res: Response
  try {
    res = await fetch(path, init)
  } catch {
    throw new ApiError('Network error — please try again', 0, null)
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // empty / non-JSON body
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`
    throw new ApiError(msg, res.status, data)
  }

  return data as T
}

/** Upload an image to an InsForge storage bucket and return its public URL. */
export async function uploadImage(
  bucket: 'avatars' | 'covers' | 'goods' | 'course-covers' | 'chat-images',
  file: File
): Promise<{ url: string; key: string; bucket: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('bucket', bucket)

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Upload failed (${res.status})`
    throw new ApiError(msg, res.status, data)
  }

  return data as { url: string; key: string; bucket: string }
}

export interface ProfileResponse {
  user: UserDTO
  stats: ProfileStats
  reviews: ReviewDTO[]
  availabilities: AvailabilityDTO[]
  posts: FeedItem[]
  /** For teachers: distinct students from hired connections (newest hire first). */
  students: StudentDTO[]
}

export interface TuitionInput {
  title: string
  description: string
  mode: 'ONLINE' | 'HOME' | 'CENTER'
  city?: string
  subjects?: string
  languages?: string
  qualification?: string
  feeMin: number
  feeMax: number
  timing?: string
}

export interface CourseInput {
  title: string
  description: string
  cover?: string
  language?: string
  subject?: string
  duration?: string
  timing?: string
  classDuration?: string
  classesPerWeek?: string
  format?: string
  fee: number
}

export interface GoodInput {
  title: string
  description: string
  image?: string
  price: number
}

export interface ProfilePatch {
  name?: string
  currency?: string
  bankName?: string
  bankAccountTitle?: string
  bankAccountNumber?: string
  headline?: string
  bio?: string
  city?: string
  avatar?: string | null
  coverImage?: string | null
  subjects?: string
  languages?: string
  qualification?: string
  feeMin?: number | null
  feeMax?: number | null
  gender?: string
  availabilities?: { day: string; slots: string }[]
}

export type LikeTargetType = 'TUITION' | 'COURSE' | 'GOOD' | 'TEACHER' | 'SHARED'

/** Target of a Facebook-style share (requirement M). */
export type ShareTargetType = Exclude<LikeTargetType, 'SHARED'>

export const api = {
  // session
  getSession: () => request<{ user: UserDTO | null }>('/api/session'),
  login: (userId: string) => request<{ user: UserDTO }>('/api/session', { method: 'POST', body: { userId } }),
  loginWithPassword: (email: string, password: string) =>
    request<{ user: UserDTO }>('/api/auth/login', { method: 'POST', body: { email, password } }),
  signup: (data: { name: string; email: string; password: string; role: string }) =>
    request<{ user: UserDTO }>('/api/auth/signup', { method: 'POST', body: data }),
  adminLogin: (email: string, password: string) =>
    request<{ user: UserDTO }>('/api/auth/admin-login', { method: 'POST', body: { email, password } }),
  logout: () => request<{ ok: true }>('/api/session', { method: 'DELETE' }),

  // uploads (InsForge storage)
  uploadImage,

  // users / profile
  getUsers: () => request<{ users: UserDTO[] }>('/api/users'),
  getUser: (id: string) => request<ProfileResponse>(`/api/users/${id}`),
  updateProfile: (id: string, patch: ProfilePatch) =>
    request<{ user: UserDTO; availabilities?: AvailabilityDTO[] }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: patch,
    }),

  // feed
  getFeed: (type: string, q?: string) =>
    request<{ items: FeedItem[] }>(`/api/feed?type=${encodeURIComponent(type)}${q ? `&q=${encodeURIComponent(q)}` : ''}`),

  // shares (Facebook-style share-to-feed — the post content is embedded, not a link)
  shareToFeed: (targetType: ShareTargetType, targetId: string, text?: string) =>
    request<{ shared: { id: string }; notified: boolean }>('/api/shares', {
      method: 'POST',
      body: { targetType, targetId, text: text ?? '' },
    }),
  deleteShare: (id: string) => request<{ ok: true }>(`/api/shares/${id}`, { method: 'DELETE' }),

  // tuition
  createTuition: (body: TuitionInput) =>
    request<{ tuition: TuitionPostDTO }>('/api/tuition', { method: 'POST', body }),
  updateTuition: (id: string, body: { status?: string; edit?: boolean } & Partial<TuitionInput>) =>
    request<{ tuition: TuitionPostDTO }>(`/api/tuition/${id}`, { method: 'PATCH', body }),
  /** Toggle a tuition-post bookmark ("Saved" list). */
  toggleSave: (id: string) =>
    request<{ saved: boolean }>(`/api/tuition/${id}/save`, { method: 'POST' }),
  /** Bookmarked tuition posts (newest save first). */
  getSaved: () => request<{ items: TuitionPostDTO[] }>('/api/saved'),

  // courses / goods
  createCourse: (body: CourseInput) => request<{ course: CourseDTO }>('/api/courses', { method: 'POST', body }),
  createGood: (body: GoodInput) => request<{ good: GoodDTO }>('/api/goods', { method: 'POST', body }),
  buyGood: (id: string) => request<{ ok: true; money: number }>(`/api/goods/${id}/buy`, { method: 'POST' }),

  // connections / chats
  getConnections: () => request<{ connections: ConnectionDTO[] }>('/api/connections'),
  getConnection: (id: string) => request<ThreadResponse>(`/api/connections/${id}`),
  createConnection: (body: { tuitionPostId?: string; teacherId?: string; courseId?: string }) =>
    request<{ connection: ConnectionDTO }>('/api/connections', { method: 'POST', body }),
  sendMessage: (id: string, body: { content?: string; image?: string }) =>
    request<{ message: MessageDTO }>(`/api/connections/${id}/messages`, { method: 'POST', body }),
  /** Toggle a Facebook-style reaction on a chat message. */
  reactMessage: (messageId: string, emoji: string) =>
    request<{ reactions: MessageReactionGroup[]; action: string }>(`/api/messages/${messageId}/react`, {
      method: 'POST',
      body: { emoji },
    }),
  /** Messenger-style unsend — replaces the message with a placeholder for everyone. */
  deleteMessage: (messageId: string) =>
    request<{ ok: true }>(`/api/messages/${messageId}`, { method: 'DELETE' }),
  /** Messenger-style forward — copy a message into another chat you belong to. */
  forwardMessage: (messageId: string, connectionId: string) =>
    request<{ message: MessageDTO }>(`/api/messages/${messageId}/forward`, {
      method: 'POST',
      body: { connectionId },
    }),
  decide: (id: string, action: 'HIRE' | 'REJECT' | 'ACCEPT' | 'BLOCK' | 'UNBLOCK' | 'REPORT', reason?: string) =>
    request<{ connection: ConnectionDTO }>(`/api/connections/${id}/decide`, {
      method: 'POST',
      body: reason ? { action, reason } : { action },
    }),

  // wallet
  getWallet: () => request<WalletResponse>('/api/wallet'),
  /** Add-money payment-screenshot proof — money credited after admin verification. */
  topUp: (body: { kind?: TopUpKind; amount: number; method: string; reference?: string; screenshot: string }) =>
    request<{ topup: TopUpDTO }>('/api/wallet/topup', { method: 'POST', body }),
  /** Withdrawal request — min 1,000 PKR, bank details required. */
  withdraw: (body: { amount: number; bankName: string; accountTitle: string; accountNumber: string }) =>
    request<{ withdrawal: WithdrawalDTO }>('/api/wallet/withdraw', { method: 'POST', body }),
  /** Public platform bank accounts shown on payment dialogs. */
  getBankAccounts: () => request<{ accounts: BankAccountDTO[] }>('/api/platform/bank-accounts'),
  /** Public exchange rates. */
  getRates: () => request<{ rates: RateDTO[] }>('/api/currency'),
  /** Teacher KYC: read mine / submit documents. */
  getMyKyc: () => request<{ kyc: { id: string; status: string; fullName: string; city: string; adminNote: string | null; decidedAt: string | null; createdAt: string } | null }>('/api/kyc'),
  submitKyc: (body: { fullName: string; cnic: string; phone: string; city: string; documentImage: string; selfieImage?: string }) =>
    request<{ kyc: { id: string; status: string } }>('/api/kyc', { method: 'POST', body }),

  // premium plans + affiliate program
  getPlans: () =>
    request<{ plans: PlanDTO[]; myPlanTier: string | null; affiliateCode: string | null; role: string }>('/api/plans'),
  /** Payment-screenshot plan purchase — coins credited instantly, clawed back if rejected. */
  purchasePlan: (body: { tier: PlanTier; method: string; reference?: string; screenshot: string; refCode?: string }) =>
    request<{ purchase: { id: string; tier: PlanTier; price: number; coinsGranted: number; status: string }; coins: number }>(
      '/api/plans/purchase',
      { method: 'POST', body }
    ),
  getAffiliate: () => request<AffiliateDTO>('/api/affiliate'),
  joinAffiliate: () =>
    request<{ joined: boolean; code: string }>('/api/affiliate/join', { method: 'POST' }),
  adminPlanPurchases: (status?: string) =>
    request<{ purchases: PlanPurchaseDTO[] }>(`/api/admin/plans${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  adminPlanAction: (id: string, action: 'APPROVE' | 'REJECT', note?: string) =>
    request<{ ok: true; status: string }>(`/api/admin/plans/${id}`, { method: 'POST', body: { action, note } }),

  // notifications
  getNotifications: () =>
    request<{ notifications: NotificationDTO[]; unread: number }>('/api/notifications'),
  markNotificationsRead: () => request<{ ok: true }>('/api/notifications/read', { method: 'POST' }),

  // engagement
  like: (targetType: LikeTargetType, targetId: string) =>
    request<{ liked: boolean; likeCount: number }>('/api/likes', { method: 'POST', body: { targetType, targetId } }),
  createReview: (body: { targetId: string; rating: number; comment?: string }) =>
    request<{ review: ReviewDTO }>('/api/reviews', { method: 'POST', body }),
  /** Reviews written by the current user (used by Monetize Reviews → "I Wrote"). */
  getWrittenReviews: () => request<{ reviews: ReviewDTO[] }>('/api/reviews/mine'),

  // settings (contract additions)
  getBlockedUsers: () => request<{ users: UserDTO[] }>('/api/settings/blocked'),
  unblockUser: (userId: string) =>
    request<{ ok: true }>('/api/settings/unblock', { method: 'POST', body: { userId } }),

  // moderation
  createReport: (body: {
    targetType: 'CHAT' | 'GOOD' | 'COURSE' | 'TUITION' | 'USER'
    targetId?: string
    targetUserId?: string
    connectionId?: string
    reason: string
    details?: string
  }) => request<{ report: ReportDTO }>('/api/reports', { method: 'POST', body }),

  // admin (role === 'ADMIN' only)
  getAdminReports: (status?: string) =>
    request<{ reports: ReportDTO[]; stats: AdminStats }>(
      `/api/admin/reports${status ? `?status=${encodeURIComponent(status)}` : ''}`
    ),
  adminReportAction: (id: string, action: 'RESOLVE' | 'DISMISS', note?: string, hideContent?: boolean) =>
    request<{ report: ReportDTO }>(`/api/admin/reports/${id}`, {
      method: 'POST',
      body: { action, ...(note ? { note } : {}), ...(hideContent ? { hideContent: true } : {}) },
    }),
  /** Soft-hide / restore a reported listing (GOOD/COURSE/TUITION). */
  adminModerateContent: (type: 'GOOD' | 'COURSE' | 'TUITION', id: string, hidden: boolean) =>
    request<{ ok: true; hidden: boolean }>('/api/admin/moderate-content', {
      method: 'POST',
      body: { type, id, hidden },
    }),
  getAdminUsers: () => request<{ users: AdminUserDTO[] }>('/api/admin/users'),
  adminSetUserStatus: (id: string, status: 'BANNED' | 'ACTIVE') =>
    request<{ user: UserDTO }>(`/api/admin/users/${id}`, { method: 'PATCH', body: { status } }),
  getAdminAnalytics: () => request<{ analytics: AdminAnalytics }>('/api/admin/analytics'),

  // admin — payments / kyc / withdrawals (requirements B, E, G)
  adminTopUps: (status?: string) =>
    request<{ topups: TopUpDTO[] }>(`/api/admin/topups${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  adminTopUpAction: (id: string, action: 'APPROVE' | 'REJECT', note?: string) =>
    request<{ ok: true; status: string }>(`/api/admin/topups/${id}`, { method: 'POST', body: { action, note } }),
  adminWithdrawals: (status?: string) =>
    request<{ withdrawals: WithdrawalDTO[] }>(`/api/admin/withdrawals${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  adminWithdrawalAction: (id: string, action: 'APPROVE' | 'REJECT', note?: string) =>
    request<{ ok: true; status: string }>(`/api/admin/withdrawals/${id}`, { method: 'POST', body: { action, note } }),
  adminKyc: (status?: string) =>
    request<{ submissions: KycDTO[] }>(`/api/admin/kyc${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  adminKycAction: (id: string, action: 'APPROVE' | 'REJECT', note?: string) =>
    request<{ ok: true; status: string }>(`/api/admin/kyc/${id}`, { method: 'POST', body: { action, note } }),

  // admin — economy: rates / bank accounts / commission / milestone (requirements D, B)
  adminRates: () => request<{ rates: RateDTO[] }>('/api/admin/rates'),
  adminUpdateRate: (code: string, pkrPer: number) =>
    request<{ rate: RateDTO }>('/api/admin/rates', { method: 'PUT', body: { code, pkrPer } }),
  adminBankAccounts: () => request<{ accounts: BankAccountDTO[] }>('/api/admin/bank-accounts'),
  adminCreateBankAccount: (body: Omit<BankAccountDTO, 'id' | 'active'>) =>
    request<{ account: BankAccountDTO }>('/api/admin/bank-accounts', { method: 'POST', body }),
  adminUpdateBankAccount: (id: string, body: Partial<Omit<BankAccountDTO, 'id'>>) =>
    request<{ account: BankAccountDTO }>(`/api/admin/bank-accounts/${id}`, { method: 'PATCH', body }),
  adminDeleteBankAccount: (id: string) =>
    request<{ ok: true }>(`/api/admin/bank-accounts/${id}`, { method: 'DELETE' }),
  adminSettings: () => request<AdminSettingsDTO>('/api/admin/settings'),
  adminUpdateSettings: (body: { commissionRate?: number }) =>
    request<{ commissionRate: number }>('/api/admin/settings', { method: 'PUT', body }),
  adminMilestone: () => request<{ paidTeachers: number; target: number; milestonePaid: boolean }>('/api/admin/milestone'),
  adminPayMilestone: () =>
    request<{ ok: true; teachers: number }>('/api/admin/milestone', { method: 'POST' }),

  // admin — AI engine agents (requirement K/A)
  adminAiAgents: () => request<{ agents: AiAgentDTO[] }>('/api/admin/ai/agents'),
  adminCreateAiAgent: (body: Record<string, unknown>) =>
    request<{ agent: { id: string } }>('/api/admin/ai/agents', { method: 'POST', body }),
  adminUpdateAiAgent: (id: string, body: Record<string, unknown>) =>
    request<{ agent: AiAgentDTO }>(`/api/admin/ai/agents/${id}`, { method: 'PATCH', body }),
  adminDeleteAiAgent: (id: string) =>
    request<{ ok: true }>(`/api/admin/ai/agents/${id}`, { method: 'DELETE' }),
  adminAiStats: () => request<{ agents: AiAgentDTO[]; llmProvider: string; wastedCoinsByRealTeachers: { teacherId: string; teacherName: string; coins: number }[]; aiMessages: number }>('/api/admin/ai'),
  adminOverview: () => request<{ overview: AdminOverview }>('/api/admin/overview'),
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}
