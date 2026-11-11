import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type ReviewStatus = 'pending' | 'approved' | 'rejected'

type ReviewRow = {
  id: string
  product_handle: string
  reviewer_name: string
  rating: number
  title: string
  body: string
  status: ReviewStatus
  created_at: string
  reviewed_at: string | null
}

type Database = {
  public: {
    Tables: {
      product_reviews: {
        Row: ReviewRow
        Insert: Pick<ReviewRow, 'product_handle' | 'reviewer_name' | 'rating' | 'title' | 'body'> &
          Partial<Pick<ReviewRow, 'id' | 'status' | 'created_at' | 'reviewed_at'>>
        Update: Partial<Omit<ReviewRow, 'id' | 'created_at' | 'product_handle'>>
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

export const REVIEW_ADMIN_COOKIE = 'quirkello_review_admin'

let adminClient: SupabaseClient<Database> | null = null

export function getReviewsAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase review storage is not configured.')
  }

  if (!adminClient) {
    adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  }

  return adminClient
}

export function isReviewsAdminTokenConfigured() {
  return Boolean(process.env.REVIEWS_ADMIN_TOKEN && process.env.REVIEWS_ADMIN_TOKEN.length >= 32)
}

function constantTimeMatches(candidate: string, expected: string) {
  const candidateDigest = createHash('sha256').update(candidate).digest()
  const expectedDigest = createHash('sha256').update(expected).digest()
  return timingSafeEqual(candidateDigest, expectedDigest)
}

export function verifyReviewsAdminToken(candidate: string) {
  const expected = process.env.REVIEWS_ADMIN_TOKEN
  return Boolean(expected && expected.length >= 32 && constantTimeMatches(candidate, expected))
}

function createAdminSessionSignature(secret: string) {
  return createHmac('sha256', secret).update('quirkello-review-admin-session:v1').digest('base64url')
}

export function isValidReviewsAdminSession(candidate?: string) {
  const secret = process.env.REVIEWS_ADMIN_TOKEN
  if (!candidate || !secret || secret.length < 32) return false
  return constantTimeMatches(candidate, createAdminSessionSignature(secret))
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function createReviewsAdminSession() {
  const secret = process.env.REVIEWS_ADMIN_TOKEN
  if (!secret || secret.length < 32) return null
  return createAdminSessionSignature(secret)
}
