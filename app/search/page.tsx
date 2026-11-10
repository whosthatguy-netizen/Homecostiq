import type { Metadata } from 'next'
import { ProductCard } from '@/components/quirkello/product-card'
import { searchProducts } from '@/lib/shopify/storefront'

export const metadata: Metadata = {
  title: 'Search the catalog',
  robots: { index: false, follow: true },
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams
  const query = Array.isArray(params.q) ? params.q[0] ?? '' : params.q ?? ''
  const result = await searchProducts(query)
  const products = result.products.filter((product) => product.availableForSale)

  return (
    <section className="mx-auto min-h-[60vh] max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Search</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{query ? `Results for “${query}”` : 'Find something unexpected.'}</h1>
      <form action="/search" className="mt-6 flex max-w-2xl gap-2">
        <label className="sr-only" htmlFor="catalog-query">Search products</label>
        <input id="catalog-query" name="q" defaultValue={query} placeholder="Try fidget, desk, or gift" className="min-h-12 min-w-0 flex-1 rounded-full border border-input bg-background px-5 outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" className="min-h-12 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:bg-secondary">Search</button>
      </form>
      {result.status !== 'ready' ? <p className="mt-8 rounded-2xl border border-border bg-muted/50 p-5 text-sm leading-relaxed text-muted-foreground">Live Shopify search is not available in this environment yet. No sample catalog is substituted.</p> : products.length ? <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="mt-8 rounded-2xl border border-border bg-muted/50 p-5 text-sm leading-relaxed text-muted-foreground">No available products matched that search in Shopify.</p>}
    </section>
  )
}
