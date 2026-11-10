'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const samplePages = [
  { image: '/demo/scene-1.png', text: 'On a bright morning, Riley tied on a little yellow apron. Today, she would make something wonderful.' },
  { image: '/demo/scene-2.png', text: 'Riley found flour, crisp apples, and a big mixing bowl. She measured, stirred, and smiled.' },
  { image: '/demo/scene-3.png', text: 'A little splash! A bit of dough landed on her nose. Riley laughed, and her helper laughed too.' },
  { image: '/demo/scene-4.png', text: 'Soon, warm apple muffins filled the kitchen with a cozy smell. Riley shared the first one and beamed: "I made this!"' },
]

export function DemoBook() {
  const [page, setPage] = useState(0)
  const current = samplePages[page - 1]

  return (
    <main className="min-h-screen px-5 pb-12 sm:px-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between py-5">
        <Link href="/" className="font-serif text-2xl font-semibold">StoryNuzzle</Link>
        <Link href="/#make-a-book" className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Make a private book</Link>
      </header>

      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-border bg-muted p-4 sm:p-5">
          <p className="font-semibold">Read-only sample</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/75">Riley and the pictures below are fictional sample content. This demo does not upload a photo, call OpenAI, save data, or represent a live personalized book.</p>
        </div>

        <div className="mx-auto mt-7 max-w-xl overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <span className="text-sm font-semibold">{page === 0 ? 'Sample cover' : `Sample scene ${page} of 4`}</span>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">DEMO ONLY</span>
          </div>
          <div className="p-5 sm:p-7">
            <Image
              src={page === 0 ? '/storynuzzle-cover.png' : current?.image ?? '/demo/scene-1.png'}
              alt={page === 0 ? 'Fictional sample child baking with a small dog' : `Fictional sample illustration for scene ${page}`}
              width={1024}
              height={1024}
              priority
              className="aspect-square w-full rounded-xl border border-border object-cover"
            />
            <h1 className="mt-5 font-serif text-3xl">{page === 0 ? "Riley's Little Book" : `Scene ${page}`}</h1>
            <p className="mt-3 min-h-16 text-lg leading-relaxed">{current?.text ?? 'The Little Kitchen Helper. This sample uses fictional illustrations and a fixed story.'}</p>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label="Previous sample page" className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Previous</button>
            <span aria-live="polite" className="text-sm text-foreground/65">{page === 0 ? 'Cover' : `${page} / 4`}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(4, value + 1))} disabled={page === 4} aria-label="Next sample page" className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Next</button>
          </div>
        </div>
      </section>
    </main>
  )
}
