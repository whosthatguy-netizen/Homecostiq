'use client'

import Link from 'next/link'
import { Search, ShoppingBag, Sparkles } from 'lucide-react'
import { useCart } from '@/components/quirkello/cart-provider'

const navigation = [
  { label: 'Toys & fidgets', href: '/collections/toys-fidgets' },
  { label: 'Clever gadgets', href: '/collections/clever-gadgets' },
  { label: 'Desk curiosities', href: '/collections/desk-curiosities' },
  { label: 'Gift finder', href: '/#gift-finder' },
]

export function StorefrontHeader() {
  const { cart, setOpen } = useCart()
  const count = cart?.totalQuantity ?? 0

  return (
    <>
      <div className="bg-primary px-4 py-2 text-center text-xs font-semibold tracking-wide text-primary-foreground sm:text-sm">
        Unexpectedly awesome, thoughtfully picked.
      </div>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label="Quirkello home">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-accent text-primary"><Sparkles className="size-5" aria-hidden="true" /></span>
            <span className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Quirkello<span className="text-secondary">.</span></span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            {navigation.map((item) => <Link key={item.href} href={item.href} className="text-sm font-semibold text-foreground/80 transition hover:text-secondary">{item.label}</Link>)}
          </nav>

          <div className="flex items-center gap-2">
            <form action="/search" role="search" className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 focus-within:ring-2 focus-within:ring-ring md:flex">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <label className="sr-only" htmlFor="site-search">Search products</label>
              <input id="site-search" name="q" placeholder="Find your next favorite" className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </form>
            <Link href="/search" className="flex size-11 items-center justify-center rounded-full border border-border transition hover:bg-muted md:hidden" aria-label="Search products"><Search className="size-5" aria-hidden="true" /></Link>
            <button type="button" onClick={() => setOpen(true)} className="relative flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-secondary" aria-label={count ? `Open shopping bag, ${count} ${count === 1 ? 'item' : 'items'}` : 'Open shopping bag'}>
              <ShoppingBag className="size-5" aria-hidden="true" />
              <span className="sr-only">{count ? `${count} items` : '0 items'}</span>
              {count > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">{count > 99 ? '99+' : count}</span>}
            </button>
          </div>
        </div>
        <nav aria-label="Shop categories" className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
          {navigation.map((item) => <Link key={item.href} href={item.href} className="shrink-0 rounded-full border border-border px-4 py-2 text-xs font-semibold transition hover:bg-muted">{item.label}</Link>)}
        </nav>
      </header>
    </>
  )
}
