import type { Money, ShopifyProduct, ShopifyVideo } from '@/lib/shopify/storefront'

export function formatMoney(money: Money) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
    maximumFractionDigits: 2,
  }).format(Number(money.amount))
}

export function formatPriceRange(product: ShopifyProduct) {
  const minimum = Number(product.priceRange.minVariantPrice.amount)
  const maximum = Number(product.priceRange.maxVariantPrice.amount)
  const currencyCode = product.priceRange.minVariantPrice.currencyCode

  if (minimum === maximum) return formatMoney(product.priceRange.minVariantPrice)
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 })
  return `${formatter.format(minimum)}–${formatter.format(maximum)}`
}

export function getDisplayProductTitle(title: string) {
  const normalizedTitle = title.replace(/\s+/g, ' ').trim()
  const lowerTitle = normalizedTitle.toLowerCase()

  if (lowerTitle.includes('christmas') && /projection|projector/.test(lowerTitle)) return 'Holiday Projection Light'
  if (/drawing\s+pad|sketchpad/.test(lowerTitle)) return '3D Drawing Pad'
  if (/thermal\s+label\s+printer|mini\s+label\s+printer/.test(lowerTitle)) return 'Mini Thermal Label Printer'

  const primaryTitle = normalizedTitle.split(/\s+[-–—|]\s+/)[0]?.trim() || normalizedTitle
  if (primaryTitle.length <= 56) return primaryTitle

  return `${primaryTitle.split(/\s+/).slice(0, 7).join(' ')}…`
}

export function getProductImageAlt(altText: string | null, title: string) {
  const normalizedAlt = altText?.trim()
  const looksLikeOpaqueId = normalizedAlt && /^[a-z0-9_-]{20,}$/i.test(normalizedAlt)
  return normalizedAlt && !looksLikeOpaqueId ? normalizedAlt : `${getDisplayProductTitle(title)} product image`
}

export function getShopifyVideo(product: ShopifyProduct): ShopifyVideo | null {
  const media = product.media.nodes.find((item) => item.__typename === 'Video')
  if (!media || media.__typename !== 'Video' || !media.sources) return null
  return {
    id: media.id,
    alt: media.alt ?? null,
    previewImage: media.previewImage ?? null,
    sources: media.sources,
  }
}

export function getProductKeywords(product: ShopifyProduct) {
  return [product.title, product.description, product.productType, product.vendor, ...product.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
