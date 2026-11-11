'use client'

import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductReviewsResponse } from '@/lib/reviews/types'

async function fetchReviews(url: string): Promise<ProductReviewsResponse> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Customer reviews could not be loaded.')
  return response.json()
}

function Stars({ rating, size = 'small' }: { rating: number; size?: 'small' | 'large' }) {
  const roundedRating = Math.round(rating)

  return (
    <span role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`} className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={`${size === 'large' ? 'size-5' : 'size-4'} ${index < roundedRating ? 'fill-current text-secondary' : 'text-muted-foreground/35'}`}
        />
      ))}
    </span>
  )
}

export function ProductReviews({ productHandle }: { productHandle: string }) {
  const endpoint = `/api/reviews?productHandle=${encodeURIComponent(productHandle)}`
  const { data, error, isLoading } = useSWR<ProductReviewsResponse>(endpoint, fetchReviews)
  const [rating, setRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setIsSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productHandle,
          reviewerName: formData.get('reviewerName'),
          rating: Number(formData.get('rating')),
          title: formData.get('title'),
          body: formData.get('body'),
          website: formData.get('website'),
        }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }

      if (!response.ok) {
        setFeedback({ type: 'error', text: result.error ?? 'Your review could not be submitted right now.' })
        return
      }

      form.reset()
      setRating(0)
      setFeedback({ type: 'success', text: 'Thanks for sharing your thoughts. Your review is waiting for approval.' })
    } catch {
      setFeedback({ type: 'error', text: 'Your review could not be submitted right now. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mt-12 border-t border-border pt-9 sm:mt-16 sm:pt-12" aria-labelledby="reviews-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Real voices, reviewed first</p>
          <h2 id="reviews-title" className="mt-2 font-serif text-3xl">Customer reviews</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Reviews are submitted by customers and approved by the store team before they appear. Purchases are not verified by this system.</p>
        </div>
        {data && data.count > 0 && data.averageRating !== null && (
          <div className="flex items-center gap-3" aria-label={`${data.count} approved ${data.count === 1 ? 'review' : 'reviews'}`}>
            <Stars rating={data.averageRating} size="large" />
            <span className="text-sm font-semibold">{data.averageRating.toFixed(1)} <span className="font-normal text-muted-foreground">({data.count})</span></span>
          </div>
        )}
      </div>

      <div className="mt-7">
        {isLoading && <p role="status" className="text-sm text-muted-foreground">Loading reviews…</p>}
        {error && <p role="alert" className="text-sm text-muted-foreground">Customer reviews could not be loaded right now.</p>}
        {data?.reviews.length === 0 && !isLoading && !error && <p className="text-sm text-muted-foreground">No approved reviews yet. Be the first to share your experience.</p>}
        {data && data.reviews.length > 0 && (
          <ul className="divide-y divide-border">
            {data.reviews.map((review) => (
              <li key={review.id} className="py-5 first:pt-0 last:pb-0">
                <article>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Stars rating={review.rating} />
                    <h3 className="font-semibold">{review.title}</h3>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{review.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {review.reviewer_name} <span aria-hidden="true">·</span>{' '}
                    <time dateTime={review.created_at}>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(review.created_at))}</time>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submitReview} className="mt-10 grid max-w-2xl gap-5 rounded-[1.5rem] border border-border bg-muted/35 p-5 sm:p-7">
        <div>
          <h3 className="font-serif text-2xl">Write a review</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your display name and review will be public if approved. Please don&apos;t include private information.</p>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Your rating</legend>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer rounded-md">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  required
                />
                <span className="inline-flex rounded-md p-1 text-muted-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring" aria-hidden="true">
                  <Star className={`size-6 ${rating >= value ? 'fill-current text-secondary' : 'text-muted-foreground/45'}`} />
                </span>
                <span className="sr-only">{value} {value === 1 ? 'star' : 'stars'}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="reviewer-name" className="grid gap-2 text-sm font-semibold">
          Display name
          <input id="reviewer-name" name="reviewerName" autoComplete="nickname" minLength={2} maxLength={60} required className="min-h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring" />
        </label>

        <label htmlFor="review-title" className="grid gap-2 text-sm font-semibold">
          Review title
          <input id="review-title" name="title" minLength={3} maxLength={120} required className="min-h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring" />
        </label>

        <label htmlFor="review-body" className="grid gap-2 text-sm font-semibold">
          Your review
          <textarea id="review-body" name="body" rows={5} minLength={10} maxLength={2000} required className="rounded-xl border border-input bg-background px-4 py-3 font-normal leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
        </label>

        <div className="sr-only" aria-hidden="true">
          <label htmlFor="review-website">Leave this field blank</label>
          <input id="review-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`text-sm leading-relaxed ${feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{feedback.text}</p>}
        <Button type="submit" size="lg" disabled={isSubmitting || rating === 0}>
          {isSubmitting ? 'Submitting…' : 'Submit for approval'}
        </Button>
      </form>
    </section>
  )
}
