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
  /** moderation access (does not change the STUDENT/PARENT/TEACHER role) */
  isAdmin: boolean
  /** moderation state: ACTIVE | BANNED */
  status: string
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
  /** viewer bookmarked this post (drives the Save/bookmark button) */
  mySave: boolean
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
  /** viewer's live PENDING/ACTIVE chat with this course teacher (null = never joined) */
  myConnectionId: string | null
  myConnectionStatus: 'PENDING' | 'ACTIVE' | null
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
  /** data-URL photo attachment (optional) */
  image: string | null
  system: boolean
  createdAt: string
  /** Set once the other party has opened the chat (drives read receipts). */
  readAt: string | null
  /** Facebook-style reaction groups (client derives "mine" via userIds). */
  reactions: MessageReactionGroup[]
}

export interface MessageReactionGroup {
  emoji: string
  count: number
  userIds: string[]
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

/** GET /api/connections/:id response — unread snapshot captured BEFORE marking read. */
export interface ThreadResponse {
  connection: ConnectionDTO
  messages: MessageDTO[]
  /** messages from the other party that were unseen when the thread was opened */
  unread: { count: number; firstId: string | null } | null
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

export interface StudentDTO {
  id: string
  name: string
  avatar: string | null
  headline: string | null
  city: string | null
  role: Role
  /** when the latest hire happened (for "hired X ago" caption) */
  hiredAt: string | null
}

// ===== Moderation (admin) =====
export type ReportTargetType = 'CHAT' | 'GOOD' | 'COURSE' | 'TUITION' | 'USER'
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

export interface ReportDTO {
  id: string
  targetType: ReportTargetType
  targetId: string | null
  connectionId: string | null
  reason: string
  details: string | null
  status: ReportStatus
  note: string | null
  resolvedAt: string | null
  createdAt: string
  reporter: Pick<UserDTO, 'id' | 'name' | 'avatar' | 'role' | 'headline' | 'city'>
  targetUser: Pick<UserDTO, 'id' | 'name' | 'avatar' | 'role' | 'headline' | 'city'> | null
  /** snapshot of reported content title (good/course/tuition) */
  targetLabel: string | null
  targetImage: string | null
  /** snapshot: is the reported listing currently soft-hidden by moderation? */
  targetHidden: boolean
}

export interface AdminUserDTO extends UserDTO {
  hireCount: number
  postCount: number
  openReports: number
}

export interface AdminStats {
  open: number
  resolved: number
  dismissed: number
  bannedUsers: number
}

// GET /api/admin/reports -> { reports, stats }
// GET /api/admin/users   -> { users: AdminUserDTO[] }

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
// GET  /api/connections/:id              -> { connection, messages, unread: {count,firstId} | null }
// GET  /api/saved                        -> { items: TuitionPostDTO[] }  (bookmarked tuition posts, newest save first)
// POST /api/tuition/:id/save             -> { saved: boolean }  (toggle bookmark)
// POST /api/connections/:id/messages { content, image? } -> { message }
// POST /api/connections/:id/decide { action: 'HIRE'|'REJECT'|'BLOCK'|'UNBLOCK'|'REPORT' } -> { connection }
// POST /api/reports { targetType, targetId?, targetUserId?, connectionId?, reason, details? } -> { report }  (create report)
// GET  /api/admin/reports?status=       -> { reports: ReportDTO[], stats: AdminStats }          (admin only)
// POST /api/admin/reports/:id { action: 'RESOLVE'|'DISMISS', note? } -> { report }               (admin only)
// GET  /api/admin/users                 -> { users: AdminUserDTO[] }                             (admin only)
// PATCH /api/admin/users/:id { status: 'BANNED'|'ACTIVE' } -> { user }                          (admin only)
// GET  /api/wallet                       -> { coins, money, transactions: CoinTransactionDTO[] }
// POST /api/wallet/buy-coins { packageId } -> { coins, transaction }
// POST /api/wallet/add-money { amount }   -> { money, transaction }
// GET  /api/notifications                -> { notifications: NotificationDTO[], unread: number }
// POST /api/notifications/read           -> { ok: true }
// POST /api/likes { targetType, targetId } -> { liked, likeCount }
// POST /api/reviews { targetId, rating, comment } -> { review }
// POST /api/cron/process-refunds         -> { processed }
