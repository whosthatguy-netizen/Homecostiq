import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, ArrowUpRight, CirclePlay, Sparkles } from 'lucide-react'
import type { CatalogResult, ShopifyProduct } from '@/lib/shopify/storefront'
import { getShopifyVideo } from '@/lib/shopify/presentation'
import { ProductCard } from '@/components/quirkello/product-card'
import { GiftFinder } from '@/components/quirkello/gift-finder'

const categories = [
  { title: 'Toys & fidgets', description: 'For hands that like to stay busy.', handle: 'toys-fidgets' },
  { title: 'Clever gadgets', description: 'Small inventions, big satisfaction.', handle: 'clever-gadgets' },
  { title: 'Desk curiosities', description: 'Make your favorite corner more fun.', handle: 'desk-curiosities' },
  { title: 'Gifts with a twist', description: 'A little unexpected, always thoughtful.', handle: 'gifts' },
]

export function StorefrontHome({ catalog }: { catalog: CatalogResult }) {
  const liveProducts = catalog.products.filter((product) => !product.tags.some((tag) => ['demo', 'sample', 'not-for-sale', 'pending-verification'].includes(tag.trim().toLowerCase())))
  const inStock = liveProducts.filter((product) => product.availableForSale)
  const under25 = inStock.filter((product) => Number(product.priceRange.minVariantPrice.amount) < 25)
  const under50 = inStock.filter((product) => Number(product.priceRange.minVariantPrice.amount) < 50)
  const bundleProducts = liveProducts.filter((product) => product.tags.some((tag) => tag.toLowerCase() === 'bundle'))
  const videos = liveProducts.flatMap((product) => {
    const video = getShopifyVideo(product)
    const source = video?.sources.find((item) => item.mimeType.startsWith('video/'))
    return video && source ? [{ product, video, source }] : []
  })

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 pt-10 sm:px-8 sm:pt-14 md:grid-cols-[0.88fr_1.12fr] md:items-center md:gap-10 md:pb-20">
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"><span className="flex size-6 items-center justify-center rounded-full bg-accent"><Sparkles className="size-3.5" aria-hidden="true" /></span> Unexpectedly awesome.</p>
          <h1 className="mt-6 max-w-2xl font-serif text-balance text-5xl font-medium leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">Find your next <span className="text-secondary">little obsession.</span></h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">Unusual toys, satisfying gadgets, and clever gifts that make ordinary moments more interesting.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#shop-the-finds" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:bg-secondary">Explore the finds <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="#gift-finder" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-border px-6 font-semibold transition hover:bg-muted">Find a gift <ArrowDown className="size-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
            <span>Curious by nature</span><span aria-hidden="true">·</span><span>Small joys, thoughtfully found</span>
          </div>
        </div>
        <div className="relative min-h-[23rem] overflow-hidden rounded-[2rem] bg-muted sm:min-h-[32rem] md:min-h-[37rem]">
          <Image src="/quirkello-hero.png" alt="Illustrative still life of unusual toys and clever desk gadgets in Quirkello&rsquo; navy, blue, yellow, and cream palette" fill priority sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" />
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-6">
            <p className="max-w-xs rounded-2xl bg-background/90 px-4 py-3 text-sm font-semibold text-foreground backdrop-blur">A playful mood board. Live products come directly from Shopify.</p>
            <span className="hidden size-14 items-center justify-center rounded-full bg-accent text-primary sm:flex"><ArrowUpRight className="size-6" aria-hidden="true" /></span>
          </div>
        </div>
      </section>

      <section aria-label="Shop by mood" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => (
            <Link key={category.handle} href={`/collections/${category.handle}`} className={`group rounded-[1.5rem] border border-border p-5 transition hover:-translate-y-1 hover:bg-muted ${index === 1 ? 'bg-accent/45' : 'bg-card'}`}>
              <div className="flex items-center justify-end"><ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" /></div>
              <h2 className="mt-7 font-serif text-2xl">{category.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="shop-the-finds" className="scroll-mt-28 bg-muted/55 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading eyebrow="Shop the finds" title="The things that make you look twice." description="Every product, price, option, and stock status comes from the connected Shopify catalog." />
          {catalog.status !== 'ready' || !catalog.products.length ? <CatalogNotice status={catalog.status} /> : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {inStock.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}
              {!inStock.length && <p className="col-span-full rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">The live Shopify catalog has products, but none are currently available for sale.</p>}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Easy on the budget</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Little surprises.<br />Lovely limits.</h2>
            <p className="mt-4 max-w-sm leading-relaxed text-muted-foreground">Browse real catalog prices in Shopify. Shipping and taxes are confirmed at checkout.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/search?q=under%2025" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-muted">Under $25 <ArrowRight className="size-4" aria-hidden="true" /></Link>
              <Link href="/search?q=under%2050" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-muted">Under $50 <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {catalog.status === 'ready' && under25.length > 0 ? under25.slice(0, 2).map((product) => <ProductCard key={`under25-${product.id}`} product={product} />) : <BudgetEmpty amount="$25" />}
            {catalog.status === 'ready' && under50.length > 0 ? under50.slice(0, 2).map((product) => <ProductCard key={`under50-${product.id}`} product={product} />) : <BudgetEmpty amount="$50" />}
          </div>
        </div>
      </section>

      <section className="bg-secondary py-16 text-secondary-foreground sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Little films, real finds" title="See the satisfying bit." description="Only Shopify-hosted product videos appear here, linked to their actual product pages." inverse />
            <Link href="/search" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-secondary-foreground/30 px-5 text-sm font-semibold transition hover:bg-secondary-foreground/10 sm:mb-1">Explore the catalog <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </div>
          {videos.length ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
              <div className="mx-auto flex max-h-[70vh] w-full max-w-md snap-y snap-mandatory flex-col gap-4 overflow-y-auto overscroll-contain scroll-smooth pr-1">
                {videos.slice(0, 4).map(({ product, video, source }) => <VideoCard key={video.id} product={product} video={video} source={source.url} />)}
              </div>
              <div className="rounded-[1.5rem] border border-secondary-foreground/20 bg-secondary-foreground/5 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Vertical product feed</p>
                <h3 className="mt-3 max-w-lg font-serif text-3xl leading-tight sm:text-4xl">One real product. One satisfying moment.</h3>
                <p className="mt-4 max-w-xl leading-relaxed text-secondary-foreground/75">Scroll the clips to discover Shopify-hosted product videos. Every card links to the matching product page, so the demo, price, variant, and availability stay together.</p>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-start gap-3 rounded-[1.5rem] border border-secondary-foreground/20 bg-secondary-foreground/5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><CirclePlay className="size-6" aria-hidden="true" /></span><div><h3 className="font-serif text-2xl">No licensed clips just yet.</h3><p className="mt-1 max-w-xl text-sm leading-relaxed text-secondary-foreground/75">When product footage is cleared and added to Shopify, shoppable clips will appear here—never stock videos pretending to show a real item.</p></div></div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <GiftFinder products={catalog.products} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
        <div className="grid gap-8 rounded-[2rem] border border-border bg-accent/50 p-6 sm:p-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em]">Curated together</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight">Good things are even better in pairs.</h2>
          </div>
          <div>
            {bundleProducts.length ? <div className="grid grid-cols-2 gap-4">{bundleProducts.slice(0, 2).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="max-w-xl text-sm leading-relaxed text-foreground/75">Shopify doesn&apos;t have a verified bundle collection yet. Once complementary products and their variants are set up, real cart-ready bundles can be featured here.</p>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8">
        <div className="grid gap-4 rounded-[1.5rem] border border-border p-6 sm:grid-cols-3 sm:p-8">
          <TrustItem title="Real product details" body="Listings and variants are read from Shopify, not invented for the page." />
          <TrustItem title="Shopify checkout" body="Prices and payment are confirmed in Shopify&rsquo; secure checkout." />
          <TrustItem title="No fake reviews" body="Verified reviews will appear only when a review source is connected." />
        </div>
      </section>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description, inverse = false }: { eyebrow: string; title: string; description: string; inverse?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className={`text-xs font-bold uppercase tracking-[0.16em] ${inverse ? 'text-accent' : 'text-secondary'}`}>{eyebrow}</p>
      <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{title}</h2>
      <p className={`mt-3 max-w-xl leading-relaxed ${inverse ? 'text-secondary-foreground/75' : 'text-muted-foreground'}`}>{description}</p>
    </div>
  )
}

function CatalogNotice({ status }: { status: CatalogResult['status'] }) {
  const copy = status === 'not-configured'
    ? ['The shelves are being set.', 'The live Shopify catalog will appear here as soon as Storefront access is ready. We do not use invented listings or prices.']
    : status === 'error'
      ? ['The live shelves are taking a moment.', 'We could not load the Shopify catalog just now. Please refresh in a moment.']
      : ['First finds are on the way.', 'The Shopify catalog is empty right now. Real listings will appear here once the products, images, prices, and availability are verified.']
  return (
    <div className="mt-8 flex flex-col gap-5 rounded-[1.75rem] border border-border bg-background p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-secondary">Catalog status</p><h3 className="mt-2 font-serif text-3xl">{copy[0]}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{copy[1]}</p></div>
      <span className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">Live Shopify data only</span>
    </div>
  )
}

function BudgetEmpty({ amount }: { amount: string }) {
  return <div className="flex min-h-64 flex-col justify-end rounded-[1.5rem] border border-dashed border-border bg-muted/40 p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">Under {amount}</p><h3 className="mt-2 font-serif text-2xl">Waiting for real finds.</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">This space updates from Shopify prices when the catalog is ready.</p></div>
}

function VideoCard({ product, video, source }: { product: ShopifyProduct; video: { alt: string | null; previewImage: { url: string; altText: string | null } | null }; source: string }) {
  return (
    <article className="snap-start overflow-hidden rounded-[1.5rem] bg-background text-foreground">
      <video className="aspect-[4/5] w-full bg-muted object-cover" controls preload="metadata" poster={video.previewImage?.url} aria-label={video.alt || `Product video for ${product.title}`}>
        <source src={source} type="video/mp4" />
        Your browser does not support the video element.
      </video>
      <div className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Shop the clip</p><h3 className="mt-1 font-semibold">{product.title}</h3></div><Link href={`/products/${product.handle}`} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary" aria-label={`View ${product.title}`}><ArrowUpRight className="size-5" aria-hidden="true" /></Link></div>
    </article>
  )
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent"><Sparkles className="size-4" aria-hidden="true" /></span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p></div></div>
}
