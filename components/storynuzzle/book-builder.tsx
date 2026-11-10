'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

type StudioConfig = { ready: boolean; mode: 'live' | 'unavailable'; model: string }
export type ShelfBook = {
  id: string
  childName: string
  status: string
  stage: string
  progress: number
  createdAt: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to check the story studio.')
  return response.json() as Promise<StudioConfig>
}

export function BookBuilder({ existingBooks }: { existingBooks: ShelfBook[] }) {
  const router = useRouter()
  const { data: config } = useSWR('/api/config', fetcher, {
    revalidateOnFocus: false,
    fallbackData: { ready: true, mode: 'live', model: 'OpenAI GPT Image 2.6 Sunburst via Vercel AI Gateway' },
  })
  const [firstName, setFirstName] = useState('')
  const [pronouns, setPronouns] = useState<'he' | 'she'>('she')
  const [photo, setPhoto] = useState<File | null>(null)
  const [guardianConsent, setGuardianConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function createBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!config?.ready) {
      setMessage('Live image generation is not configured yet. Follow the setup checklist below.')
      return
    }
    if (!photo || !guardianConsent) {
      setMessage('Choose a photo and confirm that you are the child\'s parent or legal guardian.')
      return
    }

    setBusy(true)
    setMessage('')
    const formData = new FormData()
    formData.set('firstName', firstName.trim())
    formData.set('pronouns', pronouns)
    formData.set('guardianConsent', 'true')
    formData.set('photo', photo)

    try {
      const response = await fetch('/api/books', { method: 'POST', body: formData })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'We could not save this book. Please try again.')
      try {
        await fetch(`/api/books/${payload.id}/generate`, { method: 'POST' })
      } finally {
        router.push(`/books/${payload.id}`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not save this book. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-start">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Start a new story</p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl">Who&apos;s the little helper?</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-foreground/75">Use a photo you have permission to share. We make one character portrait for your approval before creating the rest of the book.</p>
        </div>

        {config?.ready ? (
          <p className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-foreground/75">Live generation is ready with {config.model}. You&apos;ll review the character before the story illustrations are made.</p>
        ) : (
          <div id="setup" className="mb-6 rounded-2xl border border-border bg-muted p-5">
            <h3 className="font-bold">Live image generation is unavailable</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">Live creation uses OpenAI GPT Image 2.6 through Vercel AI Gateway. Vercel previews and deployments authenticate Gateway automatically, so no provider key is added to browser code or project Vars.</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/75">
              <li>Open the app in its Vercel preview or deployment, where Gateway authentication is provided automatically.</li>
              <li>If the live service remains unavailable, check the generation error on the book and retry after Gateway recovers.</li>
              <li>Use the sample below only to preview the fixed story and page-turn controls. It never substitutes for live image generation.</li>
            </ol>
            <Link href="/demo" className="mt-4 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary underline underline-offset-4 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Open the separate read-only sample</Link>
          </div>
        )}

        <form onSubmit={createBook} className="space-y-6">
          <div>
            <label htmlFor="child-first-name" className="mb-2 block text-sm font-semibold">Child&apos;s first name</label>
            <input id="child-first-name" name="firstName" type="text" required maxLength={30} autoComplete="off" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="For example, Riley" className="min-h-12 w-full rounded-xl border border-border bg-background px-4 outline-none transition placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20" />
            <p className="mt-2 text-xs leading-relaxed text-foreground/65">Only their first name appears in the story.</p>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Pronouns used in the story</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['she', 'he'] as const).map((option) => (
                <label key={option} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 transition ${pronouns === option ? 'border-primary bg-muted' : 'border-border bg-background hover:bg-muted'}`}>
                  <input type="radio" name="pronouns" value={option} checked={pronouns === option} onChange={() => setPronouns(option)} className="size-4 accent-primary" />
                  <span className="text-sm font-medium">{option === 'she' ? 'She / her' : 'He / him'}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="child-photo" className="mb-2 block text-sm font-semibold">Choose a photo</label>
            <input id="child-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} className="block min-h-12 w-full cursor-pointer rounded-xl border border-border bg-background text-sm file:mr-4 file:min-h-12 file:border-0 file:bg-muted file:px-4 file:font-semibold file:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
            <p className="mt-2 text-xs leading-relaxed text-foreground/65">JPEG, PNG, or WebP; up to 10 MB. Your original photo is deleted after you approve the character.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
            <input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} className="mt-1 size-4 accent-primary" />
            <span className="text-sm leading-relaxed">I am this child&apos;s parent or legal guardian and have permission to use this photo. I understand the photo is sent through Vercel AI Gateway to OpenAI&apos;s image model to create the portrait, and its handling follows the Vercel and OpenAI service terms.</span>
          </label>

          {message && <p role="alert" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm leading-relaxed">{message}</p>}
          <button type="submit" disabled={busy || !config?.ready} className="flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {busy ? 'Saving privately…' : config?.ready ? 'Create the character portrait' : 'Live generation not configured'}
          </button>
        </form>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[2rem] border border-border bg-muted p-6 sm:p-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">A small, clear process</p>
          <ol className="mt-5 space-y-4">
            <Step title="Make a character" detail="A single portrait is generated from your photo." />
            <Step title="You decide" detail="Approve the character or retry it before continuing." />
            <Step title="Read the adventure" detail="Four illustrated scenes become a page-turn preview and PDF." />
          </ol>
          <p className="mt-6 border-t border-border pt-5 text-sm leading-relaxed text-foreground/75">Your photos and books are private to your guardian account. The original upload is removed after approval; delete the complete book at any time.</p>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Your shelf</p>
              <h2 className="mt-2 font-serif text-2xl">Saved books</h2>
            </div>
            <span className="text-sm text-foreground/60">{existingBooks.length}/10</span>
          </div>
          {existingBooks.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-foreground/70">Your books will stay here so you can come back after a refresh.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {existingBooks.map((book) => (
                <li key={book.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/books/${book.id}`} className="group flex items-center justify-between gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span>
                      <span className="block font-semibold group-hover:text-primary">{book.childName}&apos;s little book</span>
                      <span className="mt-1 block text-xs text-foreground/65">{book.status === 'completed' && book.stage === 'story' ? 'Ready to read' : `${book.stage === 'character' ? 'Character portrait' : 'Story pages'} · ${book.status}`}</span>
                    </span>
                    <span aria-hidden="true" className="text-primary">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}

function Step({ title, detail }: { title: string; detail: string }) {
  return <li className="flex gap-3">
    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-primary" aria-hidden="true"><Check className="size-4" /></span>
    <span><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm leading-relaxed text-foreground/70">{detail}</span></span>
  </li>
}
