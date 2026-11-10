'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Gift } from 'lucide-react'
import type { ShopifyProduct } from '@/lib/shopify/storefront'
import { getProductKeywords } from '@/lib/shopify/presentation'
import { formatPriceRange } from '@/lib/shopify/presentation'
import { isDemoProduct } from '@/lib/shopify/storefront'

const interests = [
  { value: 'anything', label: 'A little of everything' },
  { value: 'fidget sensory tactile', label: 'Fidgets & sensory play' },
  { value: 'desk keyboard gadget sculpture', label: 'Clever desk things' },
  { value: 'puzzle creative activity', label: 'Puzzles & making' },
  { value: 'plush capybara soft', label: 'Soft & squishy' },
]

export function GiftFinder({ products }: { products: ShopifyProduct[] }) {
  const [recipient, setRecipient] = useState('anyone')
  const [budget, setBudget] = useState('any')
  const [interest, setInterest] = useState('anything')
  const [occasion, setOccasion] = useState('any')

  const results = useMemo(() => {
    const interestWords = interest.split(' ').filter(Boolean)
    return products.filter((product) => {
      const keywords = getProductKeywords(product)
      const demo = isDemoProduct(product)
      const minimum = Number(product.priceRange.minVariantPrice.amount)
      const inBudget = budget === 'any' || minimum <= Number(budget)
      const matchesInterest = interest === 'anything' || interestWords.some((word) => keywords.includes(word))
      const matchesRecipient = recipient === 'anyone' || keywords.includes(recipient)
      const matchesOccasion = occasion === 'any' || keywords.includes(occasion)
      return !demo && product.availableForSale && inBudget && matchesInterest && matchesRecipient && matchesOccasion
    }).slice(0, 3)
  }, [budget, interest, occasion, products, recipient])

  return (
    <section id="gift-finder" className="scroll-mt-32 rounded-[2rem] bg-primary px-5 py-8 text-primary-foreground sm:px-8 sm:py-10 lg:px-12">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground"><Gift className="size-4" aria-hidden="true" /> Gift finder</span>
          <h2 className="mt-4 max-w-md font-serif text-4xl leading-tight sm:text-5xl">A good gift, minus the guesswork.</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/75">Tell us a little about who it&apos;s for. We&apos;ll match from the live Shopify catalog—no made-up picks.</p>
        </div>
        <div className="rounded-[1.5rem] bg-background p-5 text-foreground sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold">Who&apos;s it for?
              <select value={recipient} onChange={(event) => setRecipient(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring">
                <option value="anyone">Anyone</option><option value="kids">Kids</option><option value="adults">Adults</option><option value="coworker">A coworker</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">Budget
              <select value={budget} onChange={(event) => setBudget(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring">
                <option value="any">Any budget</option><option value="25">Up to $25</option><option value="50">Up to $50</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">They&apos;re into
              <select value={interest} onChange={(event) => setInterest(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring">
                {interests.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">The occasion
              <select value={occasion} onChange={(event) => setOccasion(event.target.value)} className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring">
                <option value="any">Just because</option><option value="birthday">Birthday</option><option value="holiday">Holiday</option><option value="thank">Thank you</option>
              </select>
            </label>
          </div>
          <div aria-live="polite" className="mt-5 border-t border-border pt-4">
            {results.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {results.map((product) => <GiftResult key={product.id} product={product} />)}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">No live matches for this combination yet. As real products are added to Shopify, the finder will recommend them here.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function GiftResult({ product }: { product: ShopifyProduct }) {
  const image = product.featuredImage ?? product.images.nodes[0]
  return (
    <Link href={`/products/${product.handle}`} className="group flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">{image && <Image src={image.url} alt={image.altText || product.title} fill sizes="56px" className="object-cover" />}</div>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{product.title}</span><span className="text-xs text-muted-foreground">{formatPriceRange(product)}</span></span>
      <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  )
}
