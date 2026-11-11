import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isRateLimited } from '@/lib/reviews/rate-limit'
import {
  createReviewsAdminSession,
  isReviewsAdminTokenConfigured,
  isSameOriginRequest,
  REVIEW_ADMIN_COOKIE,
  verifyReviewsAdminToken,
} from '@/lib/reviews/server'

export const runtime = 'nodejs'

const sessionSchema = z.object({ token: z.string().min(1).max(512) }).strict()

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin could not be verified.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!isReviewsAdminTokenConfigured()) {
    return NextResponse.json({ error: 'Review moderation access is not configured yet.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  if (isRateLimited(request, 'review-admin-login', 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many sign-in attempts. Please wait and try again.' }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
  }

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Enter the moderation access token.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const parsed = sessionSchema.safeParse(input)
  if (!parsed.success || !verifyReviewsAdminToken(parsed.data.token)) {
    return NextResponse.json({ error: 'The moderation access token is not valid.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const session = createReviewsAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Review moderation access is not configured yet.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  const response = NextResponse.json({ authenticated: true }, { headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set(REVIEW_ADMIN_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: 60 * 60 * 8,
  })
  return response
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Request origin could not be verified.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }

  const response = NextResponse.json({ signedOut: true }, { headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set(REVIEW_ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: 0,
  })
  return response
}
