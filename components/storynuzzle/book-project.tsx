'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import useSWR from 'swr'

type BookState = {
  book: {
    id: string
    childName: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
    stage: 'character' | 'story'
    progress: number
    attempts: number
    characterApproved: boolean
    originalPhotoDeleted: boolean
    characterPath: string | null
    characterUrl: string | null
    updatedAt: string
  }
  pages: { sceneNumber: number; sceneText: string; illustrationPath: string | null; illustrationUrl: string | null }[]
}
type StudioConfig = { ready: boolean; mode: 'live' | 'unavailable'; model: string }

async function fetcher(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(response.status === 404 ? 'This book is not available in this session.' : 'We could not load this book.')
  return response.json()
}

export function BookProject({ bookId }: { bookId: string }) {
  const { data, error, mutate, isLoading } = useSWR<BookState>(`/api/books/${bookId}`, fetcher, {
    refreshInterval: (latest) => latest && ['pending', 'processing', 'retrying'].includes(latest.book.status) ? 3000 : 0,
    revalidateOnFocus: true,
  })
  const { data: config } = useSWR<StudioConfig>('/api/config', fetcher, { revalidateOnFocus: false })
  const [pageNumber, setPageNumber] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const stableUrls = useRef(new Map<string, string>())

  function keepUrl(path: string | null, url: string | null) {
    if (!path || !url) return null
    const old = stableUrls.current.get(path)
    if (old) return old
    stableUrls.current.set(path, url)
    return url
  }

  async function runAction(url: string, method = 'POST', payload?: { retry: boolean }) {
    setBusy(true)
    setActionError('')
    try {
      const response = await fetch(url, {
        method,
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'We could not complete that step. Please try again.')
      await mutate()
      return true
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'We could not complete that step. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) return <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8"><p role="status">Opening your book…</p></main>
  if (error || !data) return <main className="mx-auto max-w-5xl px-5 py-16 sm:px-8"><p role="alert" className="rounded-xl bg-muted p-5">{error?.message ?? 'This book is unavailable.'}</p><Link href="/" className="mt-5 inline-block font-semibold text-primary underline underline-offset-4">Return to your shelf</Link></main>

  const { book, pages } = data
  const characterUrl = keepUrl(book.characterPath, book.characterUrl)
  const pageCount = pages.filter((page) => page.illustrationPath).length
  const reading = book.stage === 'story' && book.status === 'completed' && pageCount === 4
  const activeImage = pageNumber === 0 ? characterUrl : keepUrl(pages[pageNumber - 1]?.illustrationPath ?? null, pages[pageNumber - 1]?.illustrationUrl ?? null)
  const activeText = pageNumber === 0 ? '' : pages[pageNumber - 1]?.sceneText ?? ''
  const activeHeading = pageNumber === 0 ? `${book.childName}'s little book` : `Scene ${pageNumber}`
  const stageLabel = book.stage === 'character' ? 'Character portrait' : 'Story illustrations'
  const statusLabel = {
    pending: 'Waiting to start',
    processing: 'Making your book',
    retrying: 'Trying that step again',
    failed: 'This step stopped before it finished',
    completed: book.stage === 'character' ? 'Portrait ready for your review' : 'Your story is ready',
  }[book.status]

  async function approveCharacter() {
    await runAction(`/api/books/${bookId}/approve`)
  }

  async function startGeneration() {
    await runAction(`/api/books/${bookId}/generate`)
  }

  async function deleteBook() {
    if (!window.confirm('Delete this book, its illustrations, and any remaining private photos? This cannot be undone.')) return
    const deleted = await runAction(`/api/books/${bookId}`, 'DELETE')
    if (deleted) window.location.assign('/')
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="font-serif text-2xl font-semibold">StoryNuzzle</Link>
        <Link href="/" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Your shelf</Link>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-14 sm:px-8 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)] lg:items-start">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">{stageLabel}</p>
          <h1 className="mt-3 font-serif text-4xl">{book.childName}&apos;s little book</h1>
          <p className="mt-3 leading-relaxed text-foreground/75">{statusLabel}</p>
          {['pending', 'processing', 'retrying'].includes(book.status) && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm"><span>Progress</span><span>{book.progress}%</span></div>
              <div role="progressbar" aria-label="Book generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={book.progress} className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${book.progress}%` }} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">You can leave and come back; your progress is saved privately.</p>
            </div>
          )}
          {actionError && <p role="alert" className="mt-5 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed">{actionError}</p>}

          {book.status === 'pending' && book.stage === 'character' && config?.ready && (
            <button type="button" disabled={busy} onClick={startGeneration} className="mt-6 min-h-12 w-full rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{busy ? 'Starting…' : 'Create the character portrait'}</button>
          )}

          {book.status === 'completed' && book.stage === 'character' && characterUrl && !book.characterApproved && (
            <div className="mt-6 space-y-3">
              <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed">Look closely at the character. Approve it to make the four story scenes, or retry this portrait first. Your original photo is removed when you approve.</p>
              <button type="button" disabled={busy} onClick={approveCharacter} className="min-h-12 w-full rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Approve and remove original photo</button>
              {config?.ready && <button type="button" disabled={busy || book.attempts >= 3} onClick={() => runAction(`/api/books/${bookId}/generate`, 'POST', { retry: true })} className="min-h-12 w-full rounded-full border border-border px-5 py-3 font-semibold hover:bg-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{book.attempts >= 3 ? 'Portrait retry limit reached' : 'Try a different portrait'}</button>}
            </div>
          )}

          {book.status === 'failed' && config?.ready && (
            <div className="mt-6 space-y-3">
              <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed">Your saved work is still here. You can retry this stage up to two times.</p>
              <button type="button" disabled={busy || book.attempts >= 3} onClick={startGeneration} className="min-h-12 w-full rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{busy ? 'Starting…' : book.attempts >= 3 ? 'Retry limit reached' : `Retry ${stageLabel.toLowerCase()}`}</button>
            </div>
          )}

          {book.status === 'pending' && book.stage === 'story' && book.characterApproved && config?.ready && (
            <button type="button" disabled={busy} onClick={startGeneration} className="mt-6 min-h-12 w-full rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{busy ? 'Starting…' : 'Create the four story scenes'}</button>
          )}

          {book.stage === 'story' && book.characterApproved && !reading && !config?.ready && (
            <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed">
              <strong>Live image generation is unavailable.</strong> Vercel AI Gateway provides live generation in Vercel previews and deployments. This job can be retried when Gateway is available. No fake illustrations are shown.
            </div>
          )}

          {reading && <a href={`/api/books/${bookId}/pdf`} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-primary px-5 py-3 text-center font-bold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Download the book PDF</a>}

          <button type="button" onClick={deleteBook} disabled={busy} className="mt-6 w-full rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Delete this book and its private assets</button>
        </section>

        <section aria-label="Book preview" className="rounded-[2rem] bg-muted p-4 sm:p-7">
          <div className="mx-auto flex min-h-[35rem] max-w-xl flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <span className="text-sm font-semibold">{reading ? 'Page-turn preview' : 'Character review'}</span>
              <span className="text-sm tabular-nums text-foreground/65">{pageNumber === 0 ? 'Cover' : `${pageNumber} of 4`}</span>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-6 pt-5 sm:px-8">
              {activeImage ? (
                <img src={activeImage} alt={pageNumber === 0 ? `Approved character portrait of ${book.childName}` : `Illustration for scene ${pageNumber} in ${book.childName}'s story`} className="aspect-square w-full rounded-xl border border-border bg-muted object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-border bg-muted px-8 text-center">
                  <p className="max-w-xs text-sm leading-relaxed text-foreground/70">{book.status === 'failed' ? 'Your saved illustrations will appear here after a successful retry.' : 'The private illustration will appear here when it is ready.'}</p>
                </div>
              )}
              <h2 className="mt-5 font-serif text-3xl">{activeHeading}</h2>
              {activeText ? <p className="mt-3 max-w-prose text-lg leading-relaxed">{activeText}</p> : <p className="mt-3 text-sm leading-relaxed text-foreground/70">{pageNumber === 0 ? 'Review the character before the story is illustrated.' : 'A little story made for reading together.'}</p>}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
              <button type="button" onClick={() => setPageNumber((current) => Math.max(0, current - 1))} disabled={pageNumber === 0} aria-label="Previous page" className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Previous</button>
              <span className="text-xs text-foreground/65">{reading ? `${pageNumber === 0 ? 0 : pageNumber}/${pages.length} scenes` : 'Portrait first'}</span>
              <button type="button" onClick={() => setPageNumber((current) => Math.min(4, current + 1))} disabled={!reading || pageNumber >= 4} aria-label="Next page" className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Next</button>
            </div>
          </div>
          {book.stage === 'story' && <p className="mx-auto mt-4 max-w-xl text-center text-sm text-foreground/70">{pageCount} of 4 illustrations saved · this preview uses the same text and artwork as the PDF.</p>}
        </section>
      </div>
    </main>
  )
}
