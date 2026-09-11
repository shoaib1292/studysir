import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/post/[id] — Public post data for shared links.
 * ID format: {targetType}-{targetId} (e.g., tuition-abc123)
 * Returns post details without requiring authentication.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const [targetType, ...rest] = id.split('-')
    const targetId = rest.join('-') // IDs may contain hyphens

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    let result: {
      targetType: string
      targetId: string
      title: string
      description: string
      image: string | null
      authorName: string
      price: string | null
    } | null = null

    if (targetType === 'tuition') {
      const post = await db.tuitionPost.findFirst({
        where: { id: targetId, hidden: false },
        include: { author: true },
      })
      if (post) {
        result = {
          targetType,
          targetId,
          title: post.title,
          description: post.description,
          image: post.image || '/images/cover-classroom.png',
          authorName: post.author?.name || 'Unknown',
          price: post.feeMin != null ? `PKR ${post.feeMin.toLocaleString()} - ${post.feeMax?.toLocaleString()}` : null,
        }
      }
    } else if (targetType === 'course') {
      const post = await db.course.findFirst({
        where: { id: targetId, hidden: false },
        include: { teacher: true },
      })
      if (post) {
        result = {
          targetType,
          targetId,
          title: post.title,
          description: post.description,
          image: post.cover || '/images/cover-classroom.png',
          authorName: post.teacher?.name || 'Unknown',
          price: post.fee != null ? `PKR ${post.fee.toLocaleString()}` : null,
        }
      }
    } else if (targetType === 'good') {
      const post = await db.digitalGood.findFirst({
        where: { id: targetId, hidden: false },
        include: { seller: true },
      })
      if (post) {
        result = {
          targetType,
          targetId,
          title: post.title,
          description: post.description,
          image: post.image || '/images/cover-classroom.png',
          authorName: post.seller?.name || 'Unknown',
          price: post.price != null ? `PKR ${post.price.toLocaleString()}` : null,
        }
      }
    } else if (targetType === 'teacher') {
      const post = await db.user.findFirst({
        where: { id: targetId, role: 'TEACHER', status: 'ACTIVE' },
      })
      if (post) {
        result = {
          targetType,
          targetId,
          title: post.headline || post.name || 'Teacher',
          description: post.bio || 'Teacher on StudySir',
          image: post.avatar || '/images/cover-classroom.png',
          authorName: post.name,
          price: post.feeMin != null ? `PKR ${post.feeMin.toLocaleString()} - ${(post.feeMax ?? post.feeMin).toLocaleString()}` : null,
        }
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
