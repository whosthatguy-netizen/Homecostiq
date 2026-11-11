import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isRateLimited } from '@/lib/reviews/rate-limit'
import { getReviewsAdminClient } from '@/lib/reviews/server'
import type { ProductReview } from '@/lib/reviews/types'

export const runtime = 'nodejs'

const productHandleSchema = z.string().max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const reviewSchema = z.object({
  productHandle: productHandleSchema,
  reviewerName: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(2000),
  website: z.string().max(200).optional(),
}).strict()

function noStoreHeaders() {
  return { 'Cache-Control': 'private, no-store' }
}

export async function GET(request: Request) {
  const productHandle = new URL(request.url).searchParams.get('productHandle') ?? ''
  const parsedHandle = productHandleSchema.safeParse(productHandle)
  if (!parsedHandle.success) {
    return NextResponse.json({ error: 'A valid product is required.' }, { status: 400, headers: noStoreHeaders() })
  }

  try {
    const { data, error } = await getReviewsAdminClient()
      .from('product_reviews')
      .select('id, reviewer_name, rating, title, body, created_at')
      .eq('product_handle', parsedHandle.data)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Customer reviews are temporarily unavailable.' }, { status: 503, headers: noStoreHeaders() })
    }

    const reviews = (data ?? []) as ProductReview[]
    const averageRating = reviews.length
      ? Number((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1))
      : null

    return NextResponse.json({ reviews, count: reviews.length, averageRating }, { headers: noStoreHeaders() })
  } catch {
    return NextResponse.json({ error: 'Customer reviews are temporarily unavailable.' }, { status: 503, headers: noStoreHeaders() })
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || !(() => {
    try {
      return new URL(origin).origin === new URL(request.url).origin
    } catch {
      return false
    }
  })()) {
    return NextResponse.json({ error: 'Request origin could not be verified.' }, { status: 403, headers: noStoreHeaders() })
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 8192) {
    return NextResponse.json({ error: 'The review is too large.' }, { status: 413, headers: noStoreHeaders() })
  }

  if (isRateLimited(request, 'product-review', 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Please wait before submitting another review.' }, { status: 429, headers: noStoreHeaders() })
  }

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid review is required.' }, { status: 400, headers: noStoreHeaders() })
  }

  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the review fields and try again.' }, { status: 400, headers: noStoreHeaders() })
  }

  if (parsed.data.website) {
    return NextResponse.json({ submitted: true }, { status: 202, headers: noStoreHeaders() })
  }

  try {
    const { error } = await getReviewsAdminClient().from('product_reviews').insert({
      product_handle: parsed.data.productHandle,
      reviewer_name: parsed.data.reviewerName,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: 'pending',
    })

    if (error) {
      return NextResponse.json({ error: 'Your review could not be submitted right now.' }, { status: 503, headers: noStoreHeaders() })
    }

    return NextResponse.json({ submitted: true }, { status: 201, headers: noStoreHeaders() })
  } catch {
    return NextResponse.json({ error: 'Your review could not be submitted right now.' }, { status: 503, headers: noStoreHeaders() })
  }
}
