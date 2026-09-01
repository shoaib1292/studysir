import { db } from '@/lib/db'
import type { PrismaUser } from './dto-types'
import type {
  AdminUserDTO,
  ConnectionDTO,
  CourseDTO,
  FeedItem,
  GoodDTO,
  MessageDTO,
  ReportDTO,
  TeacherCardDTO,
  TuitionPostDTO,
  UserDTO,
} from './types'

type AnyRecord = Record<string, unknown>

export function toUserDTO(u: AnyRecord | null): UserDTO | null {
  if (!u) return null
  return {
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    role: u.role as UserDTO['role'],
    avatar: (u.avatar as string) ?? null,
    coverImage: (u.coverImage as string) ?? null,
    headline: (u.headline as string) ?? null,
    bio: (u.bio as string) ?? null,
    city: (u.city as string) ?? null,
    country: (u.country as string) ?? null,
    gender: (u.gender as string) ?? null,
    qualification: (u.qualification as string) ?? null,
    subjects: (u.subjects as string) ?? null,
    languages: (u.languages as string) ?? null,
    feeMin: (u.feeMin as number) ?? null,
    feeMax: (u.feeMax as number) ?? null,
    coins: u.coins as number,
    money: u.money as number,
    isVerified: u.isVerified as boolean,
    isAdmin: Boolean(u.isAdmin),
    status: (u.status as string) ?? 'ACTIVE',
    createdAt: (u.createdAt as Date).toISOString(),
  }
}

export function pickUser(u: AnyRecord) {
  return {
    id: u.id as string,
    name: u.name as string,
    avatar: (u.avatar as string) ?? null,
    role: u.role as UserDTO['role'],
    headline: (u.headline as string) ?? null,
    city: (u.city as string) ?? null,
  }
}

export async function likeInfo(targetType: string, targetId: string, viewerId?: string | null) {
  const [count, mine] = await Promise.all([
    db.like.count({ where: { targetType, targetId } }),
    viewerId
      ? db.like.findFirst({ where: { userId: viewerId, targetType, targetId }, select: { id: true } })
      : Promise.resolve(null),
  ])
  return { likeCount: count, myLike: Boolean(mine) }
}

export async function toTuitionDTO(t: AnyRecord, viewerId?: string | null): Promise<TuitionPostDTO> {
  const tuitionId = t.id as string
  const [like, connCount, existing, authorRating, saved] = await Promise.all([
    likeInfo('TUITION', tuitionId, viewerId),
    db.connection.count({ where: { tuitionPostId: tuitionId } }),
    viewerId
      ? db.connection.findFirst({
          where: {
            tuitionPostId: t.id as string,
            OR: [{ teacherId: viewerId }, { studentId: viewerId }],
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    db.review.findMany({
      where: { targetId: (t.author as AnyRecord).id as string },
      select: { rating: true },
    }),
    viewerId
      ? db.save.findUnique({
          where: { userId_tuitionPostId: { userId: viewerId, tuitionPostId: t.id as string } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])
  const avg = authorRating.length ? authorRating.reduce((a, r) => a + r.rating, 0) / authorRating.length : 0
  return {
    id: t.id as string,
    authorId: t.authorId as string,
    author: pickUser(t.author as AnyRecord),
    title: t.title as string,
    description: t.description as string,
    mode: t.mode as TuitionPostDTO['mode'],
    city: (t.city as string) ?? null,
    subjects: (t.subjects as string) ?? null,
    languages: (t.languages as string) ?? null,
    qualification: (t.qualification as string) ?? null,
    feeMin: t.feeMin as number,
    feeMax: t.feeMax as number,
    timing: (t.timing as string) ?? null,
    coinCost: t.coinCost as number,
    status: t.status as TuitionPostDTO['status'],
    likeCount: like.likeCount,
    myLike: like.myLike,
    mySave: Boolean(saved),
    createdAt: (t.createdAt as Date).toISOString(),
    connectionCount: connCount,
    existingConnectionId: existing?.id ?? null,
    authorAvgRating: Math.round(avg * 10) / 10,
  } as TuitionPostDTO & { authorAvgRating: number }
}

export async function toCourseDTO(c: AnyRecord, viewerId?: string | null): Promise<CourseDTO> {
  const [like, myConn] = await Promise.all([
    likeInfo('COURSE', c.id as string, viewerId),
    viewerId
      ? db.connection.findFirst({
          // mirrors the reuse-check in POST /api/connections: any live chat with
          // this teacher (tuition-post based or direct) is reused for course joins
          where: {
            teacherId: c.teacherId as string,
            studentId: viewerId,
            status: { in: ['PENDING', 'ACTIVE'] },
          },
          select: { id: true, status: true },
        })
      : Promise.resolve(null),
  ])
  const fee = (c.fee as number) ?? 0
  return {
    id: c.id as string,
    teacherId: c.teacherId as string,
    teacher: pickUser(c.teacher as AnyRecord),
    title: c.title as string,
    description: c.description as string,
    cover: (c.cover as string) ?? null,
    language: (c.language as string) ?? null,
    subject: (c.subject as string) ?? null,
    duration: (c.duration as string) ?? null,
    timing: (c.timing as string) ?? null,
    classDuration: (c.classDuration as string) ?? null,
    classesPerWeek: (c.classesPerWeek as string) ?? null,
    format: (c.format as string) ?? null,
    fee,
    likeCount: like.likeCount,
    myLike: like.myLike,
    createdAt: (c.createdAt as Date).toISOString(),
    connectionCost: Math.min(50, Math.max(5, 5 + Math.round(fee / 10))),
    myConnectionId: myConn?.id ?? null,
    myConnectionStatus: (myConn?.status as 'PENDING' | 'ACTIVE') ?? null,
  }
}

export async function toGoodDTO(g: AnyRecord, viewerId?: string | null): Promise<GoodDTO> {
  const [like, purchased] = await Promise.all([
    likeInfo('GOOD', g.id as string, viewerId),
    viewerId
      ? db.purchase.findFirst({ where: { userId: viewerId, goodId: g.id as string }, select: { id: true } })
      : Promise.resolve(null),
  ])
  return {
    id: g.id as string,
    sellerId: g.sellerId as string,
    seller: pickUser(g.seller as AnyRecord),
    title: g.title as string,
    description: g.description as string,
    image: (g.image as string) ?? null,
    price: g.price as number,
    likeCount: like.likeCount,
    myLike: like.myLike,
    purchased: Boolean(purchased),
    createdAt: (g.createdAt as Date).toISOString(),
  }
}

export async function toTeacherCardDTO(u: AnyRecord, viewerId?: string | null): Promise<TeacherCardDTO> {
  const [like, reviews, connections] = await Promise.all([
    likeInfo('TEACHER', u.id as string, viewerId),
    db.review.findMany({ where: { targetId: u.id as string }, select: { rating: true } }),
    db.connection.count({ where: { teacherId: u.id as string, status: { in: ['HIRED', 'ACTIVE'] } } }),
  ])
  const hires = await db.connection.count({ where: { teacherId: u.id as string, status: 'HIRED' } })
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0
  return {
    id: u.id as string,
    name: u.name as string,
    avatar: (u.avatar as string) ?? null,
    coverImage: (u.coverImage as string) ?? null,
    headline: (u.headline as string) ?? null,
    bio: (u.bio as string) ?? null,
    city: (u.city as string) ?? null,
    gender: (u.gender as string) ?? null,
    feeMin: (u.feeMin as number) ?? null,
    feeMax: (u.feeMax as number) ?? null,
    likeCount: like.likeCount,
    reviewCount: reviews.length,
    avgRating: Math.round(avg * 10) / 10,
    hireCount: hires,
    myLike: like.myLike,
    isVerified: u.isVerified as boolean,
  }
}

export function toConnectionDTO(
  c: AnyRecord,
  viewerId: string,
  lastMessage?: AnyRecord | null,
  unreadCount = 0
): ConnectionDTO {
  return {
    id: c.id as string,
    status: c.status as ConnectionDTO['status'],
    coinsSpent: c.coinsSpent as number,
    refunded: c.refunded as boolean,
    blockedBy: (c.blockedBy as string) ?? null,
    chatStartedAt: (c.chatStartedAt as Date | null)?.toISOString() ?? null,
    decidedAt: (c.decidedAt as Date | null)?.toISOString() ?? null,
    createdAt: (c.createdAt as Date).toISOString(),
    teacher: toUserDTO(c.teacher as AnyRecord)!,
    student: toUserDTO(c.student as AnyRecord)!,
    tuitionPost: c.tuitionPost
      ? {
          id: (c.tuitionPost as AnyRecord).id as string,
          title: (c.tuitionPost as AnyRecord).title as string,
          coinCost: (c.tuitionPost as AnyRecord).coinCost as number,
        }
      : null,
    lastMessage: lastMessage
      ? {
          content: lastMessage.content as string,
          createdAt: (lastMessage.createdAt as Date).toISOString(),
          senderId: lastMessage.senderId as string,
        }
      : null,
    unreadCount,
  }
}

export function toMessageDTO(m: AnyRecord): MessageDTO {
  // Aggregate reaction rows into emoji groups (client derives "mine" from userIds)
  const raw = Array.isArray(m.reactions) ? (m.reactions as AnyRecord[]) : []
  const groups = new Map<string, string[]>()
  for (const r of raw) {
    const emoji = r.emoji as string
    const uid = ((r.userId as string) ?? ((r.user as AnyRecord | undefined)?.id as string)) || ''
    if (!emoji) continue
    const arr = groups.get(emoji) ?? []
    if (uid) arr.push(uid)
    groups.set(emoji, arr)
  }
  return {
    id: m.id as string,
    connectionId: m.connectionId as string,
    senderId: m.senderId as string,
    sender: pickUser(m.sender as AnyRecord),
    content: m.content as string,
    image: (m.image as string) ?? null,
    system: m.system as boolean,
    createdAt: (m.createdAt as Date).toISOString(),
    readAt: m.readAt ? (m.readAt as Date).toISOString() : null,
    reactions: [...groups.entries()].map(([emoji, userIds]) => ({ emoji, count: userIds.length, userIds })),
  }
}

export { db }
export type { PrismaUser }

// ===== Moderation (admin) serializers =====
export function toReportDTO(r: AnyRecord): ReportDTO {
  return {
    id: r.id as string,
    targetType: r.targetType as ReportDTO['targetType'],
    targetId: (r.targetId as string) ?? null,
    connectionId: (r.connectionId as string) ?? null,
    reason: r.reason as string,
    details: (r.details as string) ?? null,
    status: r.status as ReportDTO['status'],
    note: (r.note as string) ?? null,
    resolvedAt: r.resolvedAt ? (r.resolvedAt as Date).toISOString() : null,
    createdAt: (r.createdAt as Date).toISOString(),
    reporter: pickUser(r.reporter as AnyRecord),
    targetUser: r.targetUser ? pickUser(r.targetUser as AnyRecord) : null,
    /** snapshot of the reported content (good/course/tuition) when applicable */
    targetLabel: (r.targetLabel as string) ?? null,
    targetImage: (r.targetImage as string) ?? null,
    /** snapshot: is the reported listing currently soft-hidden by moderation? */
    targetHidden: Boolean(r.targetHidden),
  }
}

export function toAdminUserDTO(u: AnyRecord, extra: { hireCount: number; postCount: number; openReports: number }): AdminUserDTO {
  const base = toUserDTO(u)!
  return {
    ...base,
    hireCount: extra.hireCount,
    postCount: extra.postCount,
    openReports: extra.openReports,
  }
}
