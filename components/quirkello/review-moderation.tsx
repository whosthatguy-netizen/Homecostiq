'use client'

import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import type { PendingProductReview } from '@/lib/reviews/types'

type ModerationApiError = Error & { status?: number }

async function fetchPendingReviews(): Promise<PendingProductReview[] | null> {
  const response = await fetch('/api/admin/reviews', { cache: 'no-store' })
  if (response.status === 401) return null

  const result = await response.json().catch(() => ({})) as { reviews?: PendingProductReview[]; error?: string }
  if (!response.ok) {
    const error = new Error(result.error ?? 'The moderation queue could not be loaded.') as ModerationApiError
    error.status = response.status
    throw error
  }

  return result.reviews ?? []
}

export function ReviewModeration() {
  const { data, error, isLoading, mutate } = useSWR<PendingProductReview[] | null>('/api/admin/reviews', fetchPendingReviews, { shouldRetryOnError: false })
  const [token, setToken] = useState('')
  const [loginError, setLoginError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [workingReviewId, setWorkingReviewId] = useState<string | null>(null)

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSigningIn(true)
    setLoginError('')

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        setLoginError(result.error ?? 'Unable to sign in.')
        return
      }

      setToken('')
      await mutate()
    } catch {
      setLoginError('Unable to sign in right now. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  async function updateReview(id: string, status: 'approved' | 'rejected') {
    setWorkingReviewId(id)
    setActionError('')
    setNotice('')

    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) {
        setActionError(result.error ?? 'The review could not be updated.')
        return
      }

      await mutate()
      setNotice(status === 'approved' ? 'Review approved and now visible on its product page.' : 'Review rejected and kept hidden.')
    } catch {
      setActionError('The review could not be updated right now. Please try again.')
    } finally {
      setWorkingReviewId(null)
    }
  }

  async function signOut() {
    await fetch('/api/admin/session', { method: 'DELETE' })
    setNotice('')
    setActionError('')
    await mutate(null, { revalidate: false })
  }

  const fetchError = error as ModerationApiError | undefined

  return (
    <main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Store staff</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl">Review moderation</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Approve customer-submitted reviews before they appear on product pages. This queue does not verify purchases.</p>
        </div>
        {Array.isArray(data) && <Button type="button" variant="outline" onClick={signOut}>Sign out</Button>}
      </div>

      {isLoading && <p role="status" className="mt-8 text-sm text-muted-foreground">Checking moderation access…</p>}

      {!isLoading && fetchError?.status === 503 && (
        <section className="mt-8 rounded-2xl border border-border bg-muted/40 p-5" aria-labelledby="moderation-setup-title">
          <h2 id="moderation-setup-title" className="font-semibold">Moderation access needs setup</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Add a private <code className="font-mono text-foreground">REVIEWS_ADMIN_TOKEN</code> project variable with at least 32 characters, then reload this page.</p>
        </section>
      )}

      {!isLoading && !error && data === null && (
        <form onSubmit={signIn} className="mt-8 grid max-w-lg gap-4 rounded-2xl border border-border bg-muted/40 p-5 sm:p-7">
          <label htmlFor="moderation-token" className="grid gap-2 text-sm font-semibold">
            Moderation access token
            <input id="moderation-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" required className="min-h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring" />
          </label>
          {loginError && <p role="alert" className="text-sm text-destructive">{loginError}</p>}
          <Button type="submit" size="lg" disabled={isSigningIn || !token}>{isSigningIn ? 'Signing in…' : 'Open review queue'}</Button>
        </form>
      )}

      {Array.isArray(data) && (
        <section className="mt-8" aria-labelledby="pending-reviews-title">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="pending-reviews-title" className="font-serif text-2xl">Waiting for approval</h2>
            <p className="text-sm text-muted-foreground">{data.length} {data.length === 1 ? 'review' : 'reviews'}</p>
          </div>
          {actionError && <p role="alert" className="mt-4 text-sm text-destructive">{actionError}</p>}
          {notice && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
          {data.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">You&apos;re all caught up. New reviews will appear here after they are submitted.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {data.map((review) => (
                <li key={review.id} className="py-6 first:pt-2">
                  <article>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{review.product_handle} · {review.rating} / 5</p>
                        <h3 className="mt-2 font-semibold">{review.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">By {review.reviewer_name} · {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(review.created_at))}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button type="button" size="sm" disabled={workingReviewId === review.id} onClick={() => updateReview(review.id, 'approved')}>Approve</Button>
                        <Button type="button" size="sm" variant="outline" disabled={workingReviewId === review.id} onClick={() => updateReview(review.id, 'rejected')}>Reject</Button>
                      </div>
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{review.body}</p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
