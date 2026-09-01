// ===== Shared API contract types for Study Sir =====

export type Role = 'STUDENT' | 'PARENT' | 'TEACHER'

export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'HIRED' | 'REJECTED' | 'EXPIRED'

export interface UserDTO {
  id: string
  name: string
  email: string
  role: Role
  avatar: string | null
  coverImage: string | null
  headline: string | null
  bio: string | null
  city: string | null
  country: string | null
  gender: string | null
  qualification: string | null
  subjects: string | null
  languages: string | null
  feeMin: number | null
  feeMax: number | null
  coins: number
  money: number
  isVerified: boolean
  createdAt: string
}

export interface TuitionPostDTO {
  id: string
  authorId: string
  author: Pick<UserDTO, 'id' | 'name' | 'avatar' | 'role' | 'headline' | 'city'>
  title: string
  description: string
  mode: 'ONLINE' | 'HOME' | 'CENTER'
  city: string | null
  subjects: string | null
  languages: string | null
  qualification: string | null
  feeMin: number
  feeMax: number
  timing: string | null
  coinCost: number
  status: 'OPEN' | 'HIRED' | 'CLOSED'
  likeCount: number
  myLike: boolean
  createdAt: string
  connectionCount?: number
  existingConnectionId?: string | null
}

export interface CourseDTO {
  id: string
  teacherId: string
  teacher: Pick<UserDTO, 'id' | 'name' | 'avatar' | 'role' | 'headline' | 'city'>
  title: string
  description: string
  cover: string | null
  language: string | null
  subject: string | null
  duration: string | null
  timing: string | null
  classDuration: string | null
  classesPerWeek: string | null
  format: string | null
  fee: number
  likeCount: number
  myLike: boolean
  createdAt: string
  connectionCost: number
}

export interface GoodDTO {
  id: string
  sellerId: string
  seller: Pick<UserDTO, 'id' | 'name' | 'avatar' | 'role' | 'headline' | 'city'>
  title: string
  description: string
  image: string | null
  price: number
  likeCount: number
  myLike: boolean
  purchased: boolean
  createdAt: string
}

export interface TeacherCardDTO {
  id: string
  name: string
  avatar: string | null
  coverImage: string | null
  headline: string | null
  bio: string | null
  city: string | null
  gender: string | null
  feeMin: number | null
  feeMax: number | null
  likeCount: number
  reviewCount: number
  avgRating: number
  hireCount: number
  myLike: boolean
  isVerified: boolean
}

export type FeedItem =
  | { kind: 'tuition'; createdAt: string; tuition: TuitionPostDTO }
  | { kind: 'course'; createdAt: string; course: CourseDTO }
  | { kind: 'good'; createdAt: string; good: GoodDTO }
  | { kind: 'teacher'; createdAt: string; teacher: TeacherCardDTO }

export interface MessageDTO {
  id: string
  connectionId: string
  senderId: string
  sender: Pick<UserDTO, 'id' | 'name' | 'avatar'>
  content: string
  system: boolean
  createdAt: string
}

export interface ConnectionDTO {
  id: string
  status: ConnectionStatus
  coinsSpent: number
  refunded: boolean
  blockedBy: string | null
  chatStartedAt: string | null
  decidedAt: string | null
  createdAt: string
  teacher: UserDTO
  student: UserDTO
  tuitionPost: { id: string; title: string; coinCost: number } | null
  lastMessage: { content: string; createdAt: string; senderId: string } | null
  unreadCount: number
}

export interface CoinTransactionDTO {
  id: string
  amount: number
  type: string
  description: string | null
  createdAt: string
}

export interface NotificationDTO {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

export interface ReviewDTO {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  author: Pick<UserDTO, 'id' | 'name' | 'avatar' | 'headline'>
  target: Pick<UserDTO, 'id' | 'name' | 'avatar'>
}

export interface AvailabilityDTO {
  id: string
  day: string
  slots: string
}

export interface ProfileStats {
  likeCount: number
  reviewCount: number
  avgRating: number
  hireCount: number
  connectionCount: number
}

// ===== API endpoints =====
// GET  /api/session                      -> { user: UserDTO | null }
// POST  /api/session { userId }          -> { user }
// DELETE /api/session                    -> { ok: true }
// GET  /api/users                        -> { users: UserDTO[] }
// GET  /api/users/:id                    -> { user: UserDTO, stats: ProfileStats, reviews: ReviewDTO[], availabilities: AvailabilityDTO[], posts: FeedItem[] }
// PATCH /api/users/:id (own profile)     -> { user }   body: { name?, headline?, bio?, city?, avatar?, coverImage?, subjects?, languages?, qualification?, feeMin?, feeMax?, gender? }
// GET  /api/feed?type=all|tuition|course|good|teacher&q=  -> { items: FeedItem[] }
// POST /api/tuition { title, description, mode, city, subjects, languages, qualification, feeMin, feeMax, timing } -> { tuition: TuitionPostDTO }
// PATCH /api/tuition/:id { status }      -> { tuition }
// POST /api/courses { title, description, cover?, language?, subject?, duration?, timing?, classDuration?, classesPerWeek?, format?, fee } -> { course }
// POST /api/goods { title, description, image?, price, fileUrl? } -> { good }
// POST /api/goods/:id/buy                -> { ok: true, money }  (money wallet purchase; 402 if insufficient)
// GET  /api/connections                  -> { connections: ConnectionDTO[] }
// POST /api/connections { tuitionPostId? , teacherId?, courseId? } -> { connection } | 402 { error }
// GET  /api/connections/:id              -> { connection, messages: MessageDTO[] }
// POST /api/connections/:id/messages { content } -> { message }
// POST /api/connections/:id/decide { action: 'HIRE'|'REJECT'|'BLOCK'|'UNBLOCK'|'REPORT' } -> { connection }
// GET  /api/wallet                       -> { coins, money, transactions: CoinTransactionDTO[] }
// POST /api/wallet/buy-coins { packageId } -> { coins, transaction }
// POST /api/wallet/add-money { amount }   -> { money, transaction }
// GET  /api/notifications                -> { notifications: NotificationDTO[], unread: number }
// POST /api/notifications/read           -> { ok: true }
// POST /api/likes { targetType, targetId } -> { liked, likeCount }
// POST /api/reviews { targetId, rating, comment } -> { review }
// POST /api/cron/process-refunds         -> { processed }
