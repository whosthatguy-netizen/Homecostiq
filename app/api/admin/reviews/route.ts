import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getReviewsAdminClient, isReviewsAdminTokenConfigured, isSameOriginRequest, isValidReviewsAdminSession, REVIEW_ADMIN_COOKIE } from '@/lib/reviews/server'
import type { PendingProductReview } from '@/lib/reviews/types'

export const runtime = 'nodejs'

const moderationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
}).strict()

function adminAccessError(request: NextRequest) {
  if (!isReviewsAdminTokenConfigured()) {
    return NextResponse.json({ error: 'Review moderation access is not configured yet.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
  }

  if (!isValidReviewsAdminSession(request.cookies.get(REVIEW_ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Sign in to access review moderation.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } })
  }

  return null
}

export async function GET(request: NextRequest) {
  const accessError = adminAccessError(request)
  if (accessError) return accessError

  try {
    const { data, error } = await getReviewsAdminClient()
      .from('product_reviews')
      .select('id, product_handle, reviewer_name, rating, title, body, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: 'The moderation queue is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
    }

    return NextResponse.json({ reviews: (data ?? []) as PendingProductReview[] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'The moderation queue is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
  }
}

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin could not be verified.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } })
  }

  const accessError = adminAccessError(request)
  if (accessError) return accessError

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid moderation action is required.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } })
  }

  const parsed = moderationSchema.safeParse(input)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose a valid review and moderation action.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } })
  }

  try {
    const { data, error } = await getReviewsAdminClient()
      .from('product_reviews')
      .update({ status: parsed.data.status, reviewed_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'The review could not be updated right now.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
    }

    if (!data) {
      return NextResponse.json({ error: 'That review is no longer waiting for approval.' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    }

    return NextResponse.json({ updated: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'The review could not be updated right now.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
