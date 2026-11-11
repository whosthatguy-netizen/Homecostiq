import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ShopifyProduct } from '@/lib/shopify/storefront'
import { formatPriceRange, getDisplayProductTitle, getProductImageAlt } from '@/lib/shopify/presentation'
import { isDemoProduct } from '@/lib/shopify/storefront'

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const image = product.featuredImage ?? product.images.nodes[0] ?? null
  const demo = isDemoProduct(product)
  const displayTitle = getDisplayProductTitle(product.title)

  return (
    <article className="group min-w-0">
      <Link href={`/products/${product.handle}`} className="block rounded-[1.6rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-muted">
          {image ? (
            <Image src={image.url} alt={getProductImageAlt(image.altText, product.title)} fill sizes="(max-width: 640px) 80vw, (max-width: 1024px) 40vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">Image coming from the Shopify catalog</div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur">{demo ? 'Preview only' : product.availableForSale ? 'Available' : 'Sold out'}</span>
          <span aria-hidden="true" className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-accent text-primary opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><ArrowUpRight className="size-5" /></span>
        </div>
        <div className="flex items-start justify-between gap-3 px-1 pt-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug sm:text-lg">{displayTitle}</h3>
          </div>
          <p className="shrink-0 pt-1 text-sm font-semibold">{demo ? 'Price pending' : formatPriceRange(product)}</p>
        </div>
      </Link>
    </article>
  )
}
