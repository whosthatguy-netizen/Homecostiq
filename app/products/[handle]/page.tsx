import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { ProductDetail } from '@/components/quirkello/product-detail'
import { getProductByHandle, getSiteOrigin, isDemoProduct } from '@/lib/shopify/storefront'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const result = await getProductByHandle(handle)
  const product = result.product
  const origin = getSiteOrigin()

  return {
    title: product?.title ?? 'Product details',
    description: product?.description.slice(0, 160) || 'Product details from Quirkello.',
    alternates: product && origin ? { canonical: new URL(`/products/${product.handle}`, origin).toString() } : undefined,
    robots: { index: Boolean(product && !isDemoProduct(product) && product.description.trim() && product.featuredImage), follow: true },
    openGraph: product ? {
      title: product.title,
      description: product.description.slice(0, 200),
      images: product.featuredImage ? [product.featuredImage.url] : undefined,
    } : undefined,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const result = await getProductByHandle(handle)

  if (result.status === 'ready' && !result.product) {
    return <Unavailable title="That find isn&rsquo;t on the shelf." description="This product is not currently published in the Shopify catalog." />
  }
  if (!result.product) {
    return <Unavailable title="The live product details are unavailable." description="Shopify Storefront access is not ready in this environment. No sample product data is being shown." />
  }

  const product = result.product
  const origin = getSiteOrigin()
  const jsonLd = !isDemoProduct(product) ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.nodes.map((image) => image.url),
    sku: product.variants.nodes.length === 1 ? product.variants.nodes[0].sku : undefined,
    brand: product.vendor ? { '@type': 'Brand', name: product.vendor } : undefined,
    offers: product.variants.nodes.map((variant) => ({
      '@type': 'Offer',
      priceCurrency: variant.price.currencyCode,
      price: variant.price.amount,
      availability: variant.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: origin ? new URL(`/products/${product.handle}`, origin).toString() : undefined,
    })),
  } : null

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <ProductDetail key={product.id} product={product} recommendations={result.recommendations} />
    </>
  )
}

function Unavailable({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto flex min-h-[55vh] max-w-3xl flex-col justify-center px-5 py-16 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Shopify catalog</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{description}</p>
      <a href="/" className="mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:bg-secondary">Back to Quirkello <ArrowUpRight className="size-4" aria-hidden="true" /></a>
    </section>
  )
}
