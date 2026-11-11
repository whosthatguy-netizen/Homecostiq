import type { Money, ShopifyImage, ShopifyProduct, ShopifyVideo } from '@/lib/shopify/storefront'

// Shopify imports these images with opaque alt text, so filenames are allowed only after visual review.
const ENGLISH_LETTERING_IMAGE_FILENAMES = new Set([
  '28ff21dc-24b2-4509-8b98-e54bb576455b.jpg',
  'ad56bd26-5182-44c3-92b3-03b5237baa22.jpg',
  '523a6854-d307-485c-a696-79deae1be2c3.jpg',
  '9c3e7bde-a221-4cc7-8d71-e1abc6594fff.jpg',
  '95b38574f3d4bbc9245bf76297bd94d9.jpg',
  'ea14eed5-588a-44d0-802f-817e2ad83dc6.jpg',
  '782406640634.jpg',
  '278065149399244.jpg',
  '1102466908024.jpg',
  '242ae300-f540-4d6d-af9b-4874efc94095_trans.jpg',
  '1d625d9b-4008-4bc7-8031-9647887a6c68.jpg',
  'b90db79e-0f5f-433a-83f2-16533e7b317a.jpg',
  '50751b00-c6b0-45b1-8bcd-b70813208ef4_926bb9dc-1d91-42b2-af46-b62c24c4f9f3.jpg',
  'bfba3fab-0913-4176-bacf-911ce3c07b4b.jpg',
])

export function hasEnglishLettering(image: ShopifyImage | null | undefined): image is ShopifyImage {
  if (!image) return false
  const filename = image.url.split(/[?#]/, 1)[0]?.split('/').at(-1)
  return Boolean(filename && ENGLISH_LETTERING_IMAGE_FILENAMES.has(filename))
}

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
