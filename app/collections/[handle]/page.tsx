import type { Metadata } from 'next'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { ProductCard } from '@/components/quirkello/product-card'
import { getCollectionByHandle, getSiteOrigin } from '@/lib/shopify/storefront'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const result = await getCollectionByHandle(handle)
  const collection = result.collection
  const origin = getSiteOrigin()
  return {
    title: collection?.title ?? 'Collection',
    description: collection?.description || 'Browse current products from the Quirkello Shopify catalog.',
    alternates: collection && origin ? { canonical: new URL(`/collections/${collection.handle}`, origin).toString() } : undefined,
    robots: { index: Boolean(collection && collection.products.nodes.length), follow: true },
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const result = await getCollectionByHandle(handle)
  const collection = result.collection

  if (!collection || result.status !== 'ready') {
    return <section className="mx-auto flex min-h-[55vh] max-w-3xl flex-col justify-center px-5 py-16 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Shopify collection</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">This collection is being gathered.</h1><p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">Collections and products come directly from Shopify. This category is not available in the live catalog yet.</p><Link href="/" className="mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-full border border-border px-5 font-semibold transition hover:bg-muted"><ArrowLeft className="size-4" aria-hidden="true" /> Back to the shop</Link></section>
  }

  const products = collection.products.nodes.filter((product) => product.availableForSale)
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Shop the collection</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-serif text-4xl sm:text-6xl">{collection.title}</h1>{collection.description && <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{collection.description}</p>}</div>
        <span className="rounded-full border border-border px-4 py-2 text-sm font-semibold">{products.length} available</span>
      </div>
      {products.length ? <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-8 rounded-[1.5rem] border border-dashed border-border bg-muted/40 p-6"><h2 className="font-serif text-2xl">No available products in this collection.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">When a product is published and available in Shopify, it will appear here.</p><Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Return to the shop <ArrowUpRight className="size-4" aria-hidden="true" /></Link></div>}
    </section>
  )
}
