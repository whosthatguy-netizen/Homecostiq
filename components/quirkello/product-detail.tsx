'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import type { ShopifyProduct } from '@/lib/shopify/storefront'
import { formatMoney, getDisplayProductTitle, getProductImageAlt, getShopifyVideo } from '@/lib/shopify/presentation'
import { isDemoProduct } from '@/lib/shopify/storefront'
import { ProductCard } from '@/components/quirkello/product-card'
import { AddToCartButton } from '@/components/quirkello/add-to-cart-button'

export function ProductDetail({ product, recommendations }: { product: ShopifyProduct; recommendations: ShopifyProduct[] }) {
  const initialVariant = product.variants.nodes.find((variant) => variant.availableForSale) ?? product.variants.nodes[0] ?? null
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(() => Object.fromEntries((initialVariant?.selectedOptions ?? []).map((option) => [option.name, option.value])))
  const [selectedImage, setSelectedImage] = useState(0)
  const optionNames = useMemo(() => Array.from(new Set(product.variants.nodes.flatMap((variant) => variant.selectedOptions.map((option) => option.name)))), [product.variants.nodes])
  const selectedVariant = product.variants.nodes.find((variant) => optionNames.every((name) => variant.selectedOptions.find((option) => option.name === name)?.value === selectedValues[name])) ?? null
  const images = product.images.nodes.length ? product.images.nodes : product.featuredImage ? [product.featuredImage] : []
  const variantImage = selectedVariant?.image
  const galleryImage = variantImage ?? images[Math.min(selectedImage, Math.max(images.length - 1, 0))] ?? null
  const demo = isDemoProduct(product)
  const video = getShopifyVideo(product)
  const videoSource = video?.sources.find((source) => source.mimeType.startsWith('video/'))
  const displayTitle = getDisplayProductTitle(product.title)

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Back to Quirkello</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-muted">
            {galleryImage ? <Image src={galleryImage.url} alt={getProductImageAlt(galleryImage.altText, product.title)} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No product image is available in Shopify.</div>}
            {demo && <span className="absolute left-4 top-4 rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide">Demo listing — not for sale</span>}
          </div>
          {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto">{images.map((image, index) => <button key={image.url} type="button" onClick={() => setSelectedImage(index)} className={`relative size-20 shrink-0 overflow-hidden rounded-xl border-2 ${selectedImage === index ? 'border-secondary' : 'border-border'}`} aria-label={`Show image ${index + 1} of ${displayTitle}`}><Image src={image.url} alt={getProductImageAlt(image.altText, product.title)} fill sizes="80px" className="object-cover" /></button>)}</div>}
          {videoSource && <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-muted"><video controls preload="metadata" poster={video?.previewImage?.url} className="aspect-video w-full object-cover" aria-label={video?.alt || `Product demonstration for ${displayTitle}`}><source src={videoSource.url} type={videoSource.mimeType} />Your browser does not support the video element.</video></div>}
        </div>

        <div className="lg:sticky lg:top-36 lg:self-start">
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{displayTitle}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold">{demo ? 'Price pending verification' : selectedVariant ? formatMoney(selectedVariant.price) : formatMoney(product.priceRange.minVariantPrice)}</p>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${demo ? 'bg-accent text-accent-foreground' : selectedVariant?.availableForSale ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'}`}>
              {demo ? 'Preview only' : selectedVariant?.availableForSale ? 'Available' : 'Unavailable'}
            </span>
          </div>

          {product.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</p>}

          {optionNames.map((name) => {
            const values = Array.from(new Set(product.variants.nodes.flatMap((variant) => variant.selectedOptions.filter((option) => option.name === name).map((option) => option.value))))
            return (
              <label key={name} className="mt-6 flex flex-col gap-2 text-sm font-semibold">{name}
                <select value={selectedValues[name] ?? ''} onChange={(event) => setSelectedValues((current) => ({ ...current, [name]: event.target.value }))} className="min-h-12 rounded-xl border border-input bg-background px-4 font-normal outline-none focus:ring-2 focus:ring-ring">
                  {values.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            )
          })}

          <div className="mt-7"><AddToCartButton variantId={selectedVariant?.id ?? null} available={Boolean(selectedVariant?.availableForSale)} demo={demo} /></div>
          {!selectedVariant && optionNames.length > 0 && <p role="status" className="mt-3 text-sm text-muted-foreground">That combination is not currently offered.</p>}
          <p className="mt-4 text-sm text-muted-foreground">Shipping and taxes are confirmed at secure Shopify checkout.</p>

          <div className="mt-7 grid gap-3 rounded-[1.5rem] border border-border bg-muted/45 p-5 text-sm leading-relaxed">
            <p className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" /><span>Age and safety guidance should match manufacturer labeling. If it is not included in this Shopify listing, confirm it before sale.</span></p>
            <p className="flex items-start gap-3"><Check className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" /><span>Variant, availability, and price shown here are supplied by the live Shopify catalog.</span></p>
          </div>

          <section className="mt-8 border-t border-border pt-6" aria-labelledby="reviews-title">
            <h2 id="reviews-title" className="font-serif text-2xl">Customer reviews</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Verified reviews will appear when a review provider is connected. No reviews are shown until they can be verified.</p>
          </section>
        </div>
      </div>

      {recommendations.length > 0 && (
        <section className="mt-16 border-t border-border pt-12" aria-labelledby="related-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">From the live catalog</p>
          <h2 id="related-title" className="mt-2 font-serif text-3xl sm:text-4xl">You might like these, too.</h2>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{recommendations.slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </section>
      )}
    </div>
  )
}
