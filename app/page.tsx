import Image from 'next/image'
import Link from 'next/link'
import { BookBuilder, type ShelfBook } from '@/components/storynuzzle/book-builder'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let books: ShelfBook[] = []

  if (user) {
    const { data } = await supabase
      .from('story_books')
      .select('id, child_first_name, status, stage, progress, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    books = (data ?? []).map((book) => ({
      id: book.id,
      childName: book.child_first_name,
      status: book.status,
      stage: book.stage,
      progress: book.progress,
      createdAt: book.created_at,
    }))
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" aria-label="StoryNuzzle home">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground" aria-hidden="true">
            <BookMark />
          </span>
          <span className="font-serif text-2xl font-semibold tracking-tight">StoryNuzzle</span>
        </Link>
        {user ? (
          <form action="/auth/sign-out" method="post">
            <button className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/sign-in" className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Guardian sign in</Link>
        )}
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-12 pt-8 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-16 md:pb-20 md:pt-14">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-primary">
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            A little story, made just for them
          </p>
          <h1 className="font-serif text-balance text-5xl font-medium leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Their face in a story they&apos;ll <em className="text-primary">keep close.</em>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-foreground/75">
            Turn one photo into a familiar storybook hero, then read a four-scene kitchen adventure together. You approve the character before the illustrations begin.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-semibold text-foreground/75">
            <span className="rounded-full border border-border bg-card px-4 py-2">You choose the photo</span>
            <span className="rounded-full border border-border bg-card px-4 py-2">You approve the portrait</span>
            <span className="rounded-full border border-border bg-card px-4 py-2">Private by default</span>
            <Link href="/demo" className="rounded-full border border-border px-4 py-2 text-primary underline underline-offset-4 transition hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Preview the read-only sample</Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:mr-2">
          <div className="book-stage rounded-[2rem] bg-muted p-5 sm:p-8">
            <div className="mx-auto flex aspect-[2/3] max-w-[19rem] flex-col items-center justify-between overflow-hidden rounded-[1.25rem] border border-border bg-card px-6 py-8 text-center shadow-[0_20px_40px_-24px_rgba(34,51,45,0.4)]">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">A StoryNuzzle book</span>
              <div className="flex flex-col items-center">
                <Image src="/storynuzzle-cover.png" alt="A fictional child in a yellow apron making apple muffins" width={320} height={426} priority className="mb-4 aspect-[3/4] w-32 rounded-full border border-border object-cover" />
                <p className="font-serif text-3xl leading-tight">The Little<br />Kitchen Helper</p>
                <p className="mt-4 text-sm text-foreground/70">A new favorite, with your child at the heart of it.</p>
              </div>
              <span className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-foreground">Made to read together</span>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-4 -left-3 -z-10 size-24 rounded-full border border-border" aria-hidden="true" />
        </div>
      </section>

      <section id="make-a-book" className="mx-auto w-full max-w-7xl scroll-mt-8 px-5 pb-16 sm:px-8">
        {user ? (
          <BookBuilder existingBooks={books} />
        ) : (
          <div className="grid gap-8 rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">For grown-ups</p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Your family&apos;s little book nook</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-foreground/75">Create a guardian account to keep each book private, review the character portrait, and return to your stories whenever you like.</p>
            </div>
            <Link href="/sign-in" className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Sign in or create an account</Link>
          </div>
        )}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-foreground/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>StoryNuzzle · A small story to share</p>
          <p>Photos stay private. Delete a book whenever you choose.</p>
        </div>
      </footer>
    </main>
  )
}

function BookMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M12 6.5c-2.2-1.7-5-2-8-1.1v13c3-.9 5.8-.6 8 1.1m0-13c2.2-1.7 5-2 8-1.1v13c-3-.9-5.8-.6-8 1.1m0-13v13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
