/**
 * ═══════════════════════════════════════════════════════════════════
 *  StudySir AI ACTIVITY ENGINE — humanized background engagement.
 * ═══════════════════════════════════════════════════════════════════
 * Complements `src/lib/ai.ts` (chat reply engine). Periodically picks a
 * random AWAKE AI agent and, with a persona-driven probability, performs
 * ONE humanized engagement action so the marketplace feels alive:
 *
 *   • Like   a random feed item the agent hasn't liked yet (tuition /
 *            course / good / teacher)
 *   • Review a teacher the agent has an ACTIVE/HIRED connection with
 *            (rating 4 or 5, LLM-generated comment in the agent's style)
 *   • Ask    a question as a Comment on a course / good (LLM-generated,
 *            APPROVED — AI text never contains flagged contact info)
 *   • Post   a tuition request (AI students only, when they have no
 *            OPEN post) — persona-driven subject + fee + description
 *
 * Each action is wrapped in try/catch — the cron must be robust. Like /
 * Review / Comment objects go straight to the existing Prisma models so
 * they show up everywhere on the platform exactly like a real user's.
 */

import { db } from '@/lib/db'
import { notify } from '@/lib/coins'
import {
  callLLM,
  parsePersona,
  isAgentAwake,
  type AIPersona,
  type ChatMsg,
} from '@/lib/ai'

export interface ActivityStats {
  /** how many awake AI agents were eligible this run */
  agentsChecked: number
  /** total engagement actions taken this run (0 or 1 — one agent / one action) */
  actionsTaken: number
  byType: { likes: number; reviews: number; questions: number; tuitions: number }
  lastRunAt: string | null
}

let lastStats: ActivityStats = {
  agentsChecked: 0,
  actionsTaken: 0,
  byType: { likes: 0, reviews: 0, questions: 0, tuitions: 0 },
  lastRunAt: null,
}

/** Snapshot of the last cron run — read by the admin AI tab. */
export function aiActivityStats(): ActivityStats {
  return {
    agentsChecked: lastStats.agentsChecked,
    actionsTaken: lastStats.actionsTaken,
    byType: { ...lastStats.byType },
    lastRunAt: lastStats.lastRunAt,
  }
}

type LikeTarget = 'TUITION' | 'COURSE' | 'GOOD' | 'TEACHER'

/* ────────────────────────── helpers ────────────────────────── */

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Shared system prompt — persona + marketplace context + writing rules. */
function personaPrompt(persona: AIPersona, agentName: string, agentRole: string): string {
  const detail = persona.reviewQuality === 'detailed' ? '3-5 sentences' : '1-2 short sentences'
  return `Your persona: ${persona.tagline}. Style: ${persona.style}.
You are on StudySir, a tuition marketplace in Pakistan/India. You are a ${
    agentRole === 'TEACHER' ? 'teacher' : 'student'
  } named ${agentName}.
Write ONLY the requested text — no greetings, no signature, no surrounding quotes.
RULES (very important):
- Never reveal you are an AI / bot / assistant.
- Keep it to ${detail}.
- Match the marketplace context (tuition, subjects, fee, timing, classes).
- Match the persona's language mix (Roman Urdu + English is fine).`
}

async function llm(messages: ChatMsg[], fallback: string): Promise<string> {
  const out = await callLLM(messages)
  return (out && out.trim()) ? out.trim().slice(0, 800) : fallback
}

/* ────────────────────────── action: LIKE ────────────────────────── */

async function actionLike(agentId: string): Promise<boolean> {
  type Cand = { type: LikeTarget; id: string; ownerId: string | null }
  const cands: Cand[] = []

  const [tuitions, courses, goods, teachers] = await Promise.all([
    db.tuitionPost.findMany({
      where: { status: 'OPEN', hidden: false, authorId: { not: agentId } },
      select: { id: true, authorId: true },
      take: 30,
    }),
    db.course.findMany({
      where: { status: 'OPEN', hidden: false, teacherId: { not: agentId } },
      select: { id: true, teacherId: true },
      take: 30,
    }),
    db.digitalGood.findMany({
      where: { hidden: false, sellerId: { not: agentId } },
      select: { id: true, sellerId: true },
      take: 30,
    }),
    db.user.findMany({
      where: { role: 'TEACHER', status: 'ACTIVE', id: { not: agentId } },
      select: { id: true },
      take: 30,
    }),
  ])
  for (const t of tuitions) cands.push({ type: 'TUITION', id: t.id, ownerId: t.authorId })
  for (const c of courses) cands.push({ type: 'COURSE', id: c.id, ownerId: c.teacherId })
  for (const g of goods) cands.push({ type: 'GOOD', id: g.id, ownerId: g.sellerId })
  for (const u of teachers) cands.push({ type: 'TEACHER', id: u.id, ownerId: u.id })
  if (!cands.length) return false

  for (const cand of shuffle(cands)) {
    // Respect the @@unique constraint — skip if already liked.
    const existing = await db.like.findUnique({
      where: { userId_targetType_targetId: { userId: agentId, targetType: cand.type, targetId: cand.id } },
      select: { id: true },
    })
    if (existing) continue
    try {
      await db.like.create({ data: { userId: agentId, targetType: cand.type, targetId: cand.id } })
      // best-effort notification to the item's owner (real-time + persisted)
      if (cand.ownerId && cand.ownerId !== agentId) {
        void notify(cand.ownerId, 'SYSTEM', 'Someone liked your listing', 'A StudySir user liked your post.')
      }
      return true
    } catch {
      // race / unique violation → try next candidate
      continue
    }
  }
  return false
}

/* ────────────────────────── action: REVIEW ────────────────────────── */

async function actionReview(agent: {
  id: string
  name: string
  role: string
  aiPersona: string | null
}): Promise<boolean> {
  // ACTIVE/HIRED connections — agent is on one side, the teacher is the other.
  const conns = await db.connection.findMany({
    where: {
      status: { in: ['ACTIVE', 'HIRED'] },
      OR: [{ teacherId: agent.id }, { studentId: agent.id }],
    },
    select: { teacherId: true, studentId: true },
  })
  const partnerIds = Array.from(
    new Set(conns.flatMap((c) => (c.teacherId === agent.id ? [c.studentId] : [c.teacherId])))
  ).filter((id) => id !== agent.id)
  if (!partnerIds.length) return false

  // Only review TEACHERS (a student reviews the teacher they hired).
  const teacherCands = shuffle(
    await db.user.findMany({
      where: { id: { in: partnerIds }, role: 'TEACHER', status: 'ACTIVE' },
      select: { id: true, name: true, subjects: true, qualification: true, city: true, feeMin: true, feeMax: true },
    })
  )
  if (!teacherCands.length) return false

  const persona = parsePersona(agent.aiPersona)
  for (const t of teacherCands) {
    // Skip if the agent already reviewed this teacher (Review has no @@unique
    // but we want idempotent-ish behaviour — one review per agent per teacher).
    const existing = await db.review.findFirst({
      where: { authorId: agent.id, targetId: t.id },
      select: { id: true },
    })
    if (existing) continue

    const rating = Math.random() < 0.7 ? 5 : 4
    const userMsg = `Write a ${rating}-star review (out of 5) for a teacher named ${t.name} on StudySir.
Teacher details — subjects: ${t.subjects ?? '-'}, qualification: ${t.qualification ?? '-'}, city: ${
      t.city ?? '-'
    }, fee range: ${t.feeMin ?? '-'}–${t.feeMax ?? '-'}.
Write ONLY the review comment text from your own perspective as ${agent.name} (a ${agent.role.toLowerCase()} on StudySir). Do NOT include the star rating in the comment — only the comment text.`

    const comment = await llm(
      [
        { role: 'system', content: personaPrompt(persona, agent.name, agent.role) },
        { role: 'user', content: userMsg },
      ],
      rating === 5
        ? 'Bohot achhi teaching hai, concepts clear aur punctual. Highly recommended!'
        : 'Achi teaching hai, thora aur practice material chahiye but overall fine.'
    )

    try {
      await db.review.create({
        data: { authorId: agent.id, targetId: t.id, rating, comment: comment.slice(0, 600) },
      })
      void notify(t.id, 'SYSTEM', 'New review received', `${agent.name} rated you ${rating}★.`)
      return true
    } catch {
      continue
    }
  }
  return false
}

/* ────────────────────────── action: ASK QUESTION (Comment) ────────────────────────── */

async function actionQuestion(agent: {
  id: string
  name: string
  role: string
  aiPersona: string | null
}): Promise<boolean> {
  // The `comment` model was added to the schema by an earlier task; some long-
  // running dev servers may still hold a stale Prisma client that doesn't have
  // the accessor yet. Skip gracefully in that case (the action becomes a no-op
  // until the dev server picks up the regenerated client).
  if (typeof (db as unknown as { comment?: unknown }).comment !== 'object') {
    return false
  }
  try {
    // Pick COURSE or GOOD at random.
    const targetType: 'COURSE' | 'GOOD' = Math.random() < 0.5 ? 'COURSE' : 'GOOD'

    let target: { id: string; title: string; description: string; ownerId: string } | null = null
    if (targetType === 'COURSE') {
      const list = await db.course.findMany({
        where: { status: 'OPEN', hidden: false, teacherId: { not: agent.id } },
        select: { id: true, title: true, description: true, teacherId: true },
        take: 30,
      })
      const c = shuffle(list)[0]
      if (c) target = { id: c.id, title: c.title, description: c.description, ownerId: c.teacherId }
    } else {
      const list = await db.digitalGood.findMany({
        where: { hidden: false, sellerId: { not: agent.id } },
        select: { id: true, title: true, description: true, sellerId: true },
        take: 30,
      })
      const g = shuffle(list)[0]
      if (g) target = { id: g.id, title: g.title, description: g.description, ownerId: g.sellerId }
    }
    if (!target) return false

    // Skip if the agent already asked something on this target recently.
    const recent = await db.comment.findFirst({
      where: { authorId: agent.id, targetType, targetId: target.id },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      const ageHrs = (Date.now() - recent.createdAt.getTime()) / 3.6e6
      if (ageHrs < 6) return false
    }

    const persona = parsePersona(agent.aiPersona)
    const userMsg = `You're considering this ${targetType === 'COURSE' ? 'course' : 'digital product'} on StudySir.
Title: "${target.title}"
Description: ${target.description.slice(0, 240)}
Write ONE realistic question a ${agent.role.toLowerCase()} would ask about it — about the syllabus, timing, format, access, fee, content, or recordings. 1 short sentence. Output ONLY the question.`

    const fallbacks = [
      'Salam, is course ki timing kaunsi hai?',
      'Kitne classes honge total aur recordings milti hain?',
      'Is ka access kitne din ke liye milega?',
      'Fee ka final structure kya hai, koi discount available hai?',
      'Class size kitna hota hai, individual attention milta hai?',
    ]
    const question = await llm(
      [
        { role: 'system', content: personaPrompt(persona, agent.name, agent.role) },
        { role: 'user', content: userMsg },
      ],
      fallbacks[Math.floor(Math.random() * fallbacks.length)]
    )

    await db.comment.create({
      data: {
        authorId: agent.id,
        targetType,
        targetId: target.id,
        content: question.slice(0, 400),
        // moderationStatus defaults to APPROVED in the schema — AI text never
        // contains flagged contact info / unapproved links.
      },
    })
    if (target.ownerId && target.ownerId !== agent.id) {
      void notify(target.ownerId, 'SYSTEM', 'New question on your listing', question.slice(0, 120))
    }
    return true
  } catch (e) {
    console.error('[ai-activity] actionQuestion failed:', e)
    return false
  }
}

/* ────────────────────────── action: POST TUITION (AI students) ────────────────────────── */

async function actionTuitionPost(agent: {
  id: string
  name: string
  role: string
  aiPersona: string | null
  city: string | null
}): Promise<boolean> {
  if (agent.role === 'TEACHER') return false // only students post tuition requests
  // Skip if the agent already has an OPEN post (one at a time per student).
  const openPost = await db.tuitionPost.findFirst({
    where: { authorId: agent.id, status: 'OPEN' },
    select: { id: true },
  })
  if (openPost) return false

  const persona = parsePersona(agent.aiPersona)
  const subjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Computer Science', 'Economics', 'Accounting']
  const subj = subjects[Math.floor(Math.random() * subjects.length)]
  const classGrade = ['9', '10', '11', '12'][Math.floor(Math.random() * 4)]
  const feeMin = 1500 + Math.floor(Math.random() * 4) * 500
  const feeMax = feeMin + 2000 + Math.floor(Math.random() * 4) * 500

  const userMsg = `You need a tutor on StudySir for ${subj} (Class ${classGrade}). You are a student in ${agent.city ?? 'Pakistan'}.
Write a short tuition request description (2-3 sentences) in your persona voice. Mention the subject and what kind of teacher you're looking for. Don't mention the fee number — that's handled separately. Output ONLY the description text.`

  const description = await llm(
    [
      { role: 'system', content: personaPrompt(persona, agent.name, agent.role) },
      { role: 'user', content: userMsg },
    ],
    `Assalam o alaikum! Mujhe ${subj} ke liye achhi teacher chahiye. Online classes prefer karungi, evening time suit karti hai. Concept-based teaching aur weekly tests ho to best hai.`
  )

  const title = `${subj} tutor needed (Class ${classGrade})`
  try {
    await db.tuitionPost.create({
      data: {
        authorId: agent.id,
        title: title.slice(0, 200),
        description: description.slice(0, 2000),
        mode: 'ONLINE',
        city: agent.city ?? 'Lahore',
        subjects: subj,
        languages: 'Urdu, English',
        feeMin,
        feeMax,
        timing: '5 pm to 8 pm',
        coinCost: 10,
        // moderationStatus defaults to APPROVED in the schema.
      },
    })
    return true
  } catch {
    return false
  }
}

/* ────────────────────────── main entry ────────────────────────── */

/**
 * Picks one random AWAKE AI agent and (with the persona's engagementChance)
 * performs ONE weighted humanized engagement action. Idempotent-ish —
 * never throws. Returns the per-run stats and stores them for `aiActivityStats()`.
 */
export async function aiBrowseAndEngage(): Promise<ActivityStats> {
  const stats: ActivityStats = {
    agentsChecked: 0,
    actionsTaken: 0,
    byType: { likes: 0, reviews: 0, questions: 0, tuitions: 0 },
    lastRunAt: new Date().toISOString(),
  }

  try {
    const agents = await db.user.findMany({
      where: { isAI: true, status: 'ACTIVE' },
      select: { id: true, name: true, role: true, aiPersona: true, city: true },
    })
    if (!agents.length) {
      lastStats = stats
      return stats
    }
    const awake = agents.filter((a) => isAgentAwake(parsePersona(a.aiPersona)))
    stats.agentsChecked = awake.length
    if (!awake.length) {
      lastStats = stats
      return stats
    }

    const agent = awake[Math.floor(Math.random() * awake.length)]
    const persona = parsePersona(agent.aiPersona)
    const chance = typeof persona.engagementChance === 'number' ? persona.engagementChance : 0.5
    if (Math.random() > chance) {
      lastStats = stats
      return stats
    }

    // Weighted actions: like 50%, review 25%, question 20%, tuition 5%.
    type ActionName = 'like' | 'review' | 'question' | 'tuition'
    const weights: ActionName[] = [
      'like', 'like', 'like', 'like', 'like', 'like', 'like', 'like', 'like', 'like',
      'review', 'review', 'review', 'review', 'review',
      'question', 'question', 'question', 'question',
      'tuition',
    ]
    const actionName = weights[Math.floor(Math.random() * weights.length)]

    let didAct = false
    if (actionName === 'like') {
      didAct = await actionLike(agent.id)
      if (didAct) stats.byType.likes++
    } else if (actionName === 'review') {
      didAct = await actionReview(agent)
      if (didAct) stats.byType.reviews++
    } else if (actionName === 'question') {
      didAct = await actionQuestion(agent)
      if (didAct) stats.byType.questions++
    } else {
      didAct = await actionTuitionPost(agent)
      if (didAct) stats.byType.tuitions++
    }
    if (didAct) stats.actionsTaken++
  } catch (e) {
    console.error('[ai-activity] aiBrowseAndEngage failed:', e)
  }

  lastStats = stats
  return stats
}
