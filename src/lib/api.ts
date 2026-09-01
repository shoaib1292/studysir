// Typed fetch helpers for the StudySir API.
// Always sends cookies (credentials: 'include'), always relative URLs.
import type {
  AvailabilityDTO,
  CoinTransactionDTO,
  ConnectionDTO,
  CourseDTO,
  FeedItem,
  GoodDTO,
  MessageDTO,
  NotificationDTO,
  ProfileStats,
  ReviewDTO,
  TuitionPostDTO,
  UserDTO,
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

async function request<T>(
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

export interface ProfileResponse {
  user: UserDTO
  stats: ProfileStats
  reviews: ReviewDTO[]
  availabilities: AvailabilityDTO[]
  posts: FeedItem[]
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

export type LikeTargetType = 'TUITION' | 'COURSE' | 'GOOD' | 'TEACHER'

export const api = {
  // session
  getSession: () => request<{ user: UserDTO | null }>('/api/session'),
  login: (userId: string) => request<{ user: UserDTO }>('/api/session', { method: 'POST', body: { userId } }),
  logout: () => request<{ ok: true }>('/api/session', { method: 'DELETE' }),

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

  // tuition
  createTuition: (body: TuitionInput) =>
    request<{ tuition: TuitionPostDTO }>('/api/tuition', { method: 'POST', body }),
  updateTuition: (id: string, body: { status: string }) =>
    request<{ tuition: TuitionPostDTO }>(`/api/tuition/${id}`, { method: 'PATCH', body }),

  // courses / goods
  createCourse: (body: CourseInput) => request<{ course: CourseDTO }>('/api/courses', { method: 'POST', body }),
  createGood: (body: GoodInput) => request<{ good: GoodDTO }>('/api/goods', { method: 'POST', body }),
  buyGood: (id: string) => request<{ ok: true; money: number }>(`/api/goods/${id}/buy`, { method: 'POST' }),

  // connections / chats
  getConnections: () => request<{ connections: ConnectionDTO[] }>('/api/connections'),
  getConnection: (id: string) => request<{ connection: ConnectionDTO; messages: MessageDTO[] }>(`/api/connections/${id}`),
  createConnection: (body: { tuitionPostId?: string; teacherId?: string; courseId?: string }) =>
    request<{ connection: ConnectionDTO }>('/api/connections', { method: 'POST', body }),
  sendMessage: (id: string, content: string) =>
    request<{ message: MessageDTO }>(`/api/connections/${id}/messages`, { method: 'POST', body: { content } }),
  decide: (id: string, action: 'HIRE' | 'REJECT' | 'BLOCK' | 'UNBLOCK' | 'REPORT', reason?: string) =>
    request<{ connection: ConnectionDTO }>(`/api/connections/${id}/decide`, {
      method: 'POST',
      body: reason ? { action, reason } : { action },
    }),

  // wallet
  getWallet: () =>
    request<{ coins: number; money: number; transactions: CoinTransactionDTO[] }>('/api/wallet'),
  buyCoins: (packageId: string) =>
    request<{ coins: number; transaction: CoinTransactionDTO }>('/api/wallet/buy-coins', {
      method: 'POST',
      body: { packageId },
    }),
  addMoney: (amount: number) =>
    request<{ money: number; transaction: CoinTransactionDTO }>('/api/wallet/add-money', {
      method: 'POST',
      body: { amount },
    }),

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
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}
