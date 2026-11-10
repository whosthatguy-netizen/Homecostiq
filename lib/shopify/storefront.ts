export type Money = {
  amount: string
  currencyCode: string
}

export type ShopifyImage = {
  url: string
  altText: string | null
  width?: number | null
  height?: number | null
}

export type ShopifyVariant = {
  id: string
  title: string
  sku: string | null
  availableForSale: boolean
  price: Money
  selectedOptions: { name: string; value: string }[]
  image: ShopifyImage | null
}

export type ShopifyVideo = {
  id: string
  alt: string | null
  previewImage: ShopifyImage | null
  sources: { url: string; mimeType: string; format: string }[]
}

export type ShopifyMedia = {
  __typename: string
  id: string
  alt?: string | null
  previewImage?: ShopifyImage | null
  sources?: { url: string; mimeType: string; format: string }[]
}

export type ShopifyProduct = {
  id: string
  handle: string
  title: string
  description: string
  descriptionHtml: string
  vendor: string
  productType: string
  tags: string[]
  availableForSale: boolean
  createdAt: string
  featuredImage: ShopifyImage | null
  images: { nodes: ShopifyImage[] }
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money }
  variants: { nodes: ShopifyVariant[] }
  media: {
    nodes: ShopifyMedia[]
  }
}

export type ShopifyCollection = {
  id: string
  handle: string
  title: string
  description: string
  image: ShopifyImage | null
  products: { nodes: ShopifyProduct[] }
}

export type ShopifyCartLine = {
  id: string
  quantity: number
  cost: { totalAmount: Money }
  merchandise: {
    id: string
    title: string
    availableForSale: boolean
    selectedOptions: { name: string; value: string }[]
    price: Money
    product: {
      title: string
      handle: string
      featuredImage: ShopifyImage | null
    }
  }
}

export type ShopifyCart = {
  id: string
  checkoutUrl: string
  totalQuantity: number
  cost: { subtotalAmount: Money; totalAmount: Money }
  lines: { nodes: ShopifyCartLine[] }
}

export type StorefrontStatus = 'ready' | 'not-configured' | 'error'

export type CatalogResult = {
  status: StorefrontStatus
  products: ShopifyProduct[]
  collections: ShopifyCollection[]
}

export type ProductResult = {
  status: StorefrontStatus
  product: ShopifyProduct | null
  recommendations: ShopifyProduct[]
}

export type CollectionResult = {
  status: StorefrontStatus
  collection: ShopifyCollection | null
}

export type ShopPolicy = {
  title: string
  body: string
  url: string
}

export type ShopPolicies = {
  privacyPolicy: ShopPolicy | null
  refundPolicy: ShopPolicy | null
  shippingPolicy: ShopPolicy | null
  termsOfService: ShopPolicy | null
  contactInformation: ShopPolicy | null
}

const STOREFRONT_API_VERSION = '2026-04'

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  vendor
  productType
  tags
  availableForSale
  createdAt
  featuredImage { url altText width height }
  images(first: 8) { nodes { url altText width height } }
  priceRange {
    minVariantPrice { amount currencyCode }
    maxVariantPrice { amount currencyCode }
  }
  variants(first: 100) {
    nodes {
      id
      title
      sku
      availableForSale
      price { amount currencyCode }
      selectedOptions { name value }
      image { url altText width height }
    }
  }
  media(first: 6) {
    nodes {
      __typename
      id
      mediaContentType
      ... on Video {
        alt
        previewImage { url altText width height }
        sources { url mimeType format }
      }
    }
  }
`

const HOME_QUERY = `
  query QuirkelloHome {
    products(first: 24, sortKey: TITLE) {
      nodes { ${PRODUCT_FIELDS} }
    }
    collections(first: 12, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        description
        image { url altText width height }
        products(first: 4) { nodes { id handle title description vendor productType tags availableForSale createdAt featuredImage { url altText width height } images(first: 1) { nodes { url altText width height } } priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } } variants(first: 1) { nodes { id title sku availableForSale price { amount currencyCode } selectedOptions { name value } image { url altText width height } } } media(first: 1) { nodes { __typename id mediaContentType ... on Video { alt previewImage { url altText width height } sources { url mimeType format } } } } } }
      }
    }
  }
`

const PRODUCT_QUERY = `
  query QuirkelloProduct($handle: String!) {
    product(handle: $handle) { ${PRODUCT_FIELDS} }
  }
`

const RECOMMENDATIONS_QUERY = `
  query QuirkelloRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) { ${PRODUCT_FIELDS} }
  }
`

const COLLECTION_QUERY = `
  query QuirkelloCollection($handle: String!) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image { url altText width height }
      products(first: 24, sortKey: TITLE) { nodes { ${PRODUCT_FIELDS} } }
    }
  }
`

const SEARCH_QUERY = `
  query QuirkelloSearch($term: String!) {
    products(first: 24, query: $term, sortKey: TITLE) { nodes { ${PRODUCT_FIELDS} } }
  }
`

const POLICIES_QUERY = `
  query QuirkelloShopPolicies {
    shop {
      privacyPolicy { title body url }
      refundPolicy { title body url }
      shippingPolicy { title body url }
      termsOfService { title body url }
      contactInformation { title body url }
    }
  }
`

function getStorefrontConfig() {
  const rawDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim()
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim()
  if (!rawDomain || !token) return null

  const domain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  if (!/^[a-z0-9.-]+$/i.test(domain)) return null

  return {
    endpoint: `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    token,
  }
}

export function isStorefrontConfigured() {
  return getStorefrontConfig() !== null
}

export class StorefrontNotConfiguredError extends Error {
  constructor() {
    super('Shopify Storefront API is not configured for this runtime.')
    this.name = 'StorefrontNotConfiguredError'
  }
}

export async function requestStorefront<T>(
  query: string,
  variables: Record<string, unknown> = {},
  cache: 'catalog' | 'no-store' = 'catalog',
): Promise<T> {
  const config = getStorefrontConfig()
  if (!config) throw new StorefrontNotConfiguredError()

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.token,
    },
    body: JSON.stringify({ query, variables }),
    ...(cache === 'no-store'
      ? { cache: 'no-store' as const }
      : { next: { revalidate: 60, tags: ['shopify-catalog'] } }),
  })

  if (!response.ok) throw new Error(`Shopify Storefront API returned ${response.status}.`)

  const payload = (await response.json()) as {
    data?: T
    errors?: { message?: string }[]
  }

  if (payload.errors?.length || !payload.data) {
    throw new Error('Shopify Storefront API returned an invalid response.')
  }

  return payload.data
}

export async function getHomeCatalog(): Promise<CatalogResult> {
  if (!isStorefrontConfigured()) {
    return { status: 'not-configured', products: [], collections: [] }
  }

  try {
    const data = await requestStorefront<{
      products: { nodes: ShopifyProduct[] }
      collections: { nodes: ShopifyCollection[] }
    }>(HOME_QUERY)
    return {
      status: 'ready',
      products: data.products.nodes,
      collections: data.collections.nodes,
    }
  } catch {
    return { status: 'error', products: [], collections: [] }
  }
}

export async function getProductByHandle(handle: string): Promise<ProductResult> {
  if (!isStorefrontConfigured()) {
    return { status: 'not-configured', product: null, recommendations: [] }
  }

  try {
    const data = await requestStorefront<{ product: ShopifyProduct | null }>(PRODUCT_QUERY, { handle })
    if (!data.product) return { status: 'ready', product: null, recommendations: [] }

    const recommendations = await requestStorefront<{ productRecommendations: ShopifyProduct[] }>(
      RECOMMENDATIONS_QUERY,
      { productId: data.product.id },
    ).catch(() => ({ productRecommendations: [] }))

    return {
      status: 'ready',
      product: data.product,
      recommendations: recommendations.productRecommendations,
    }
  } catch {
    return { status: 'error', product: null, recommendations: [] }
  }
}

export async function getCollectionByHandle(handle: string): Promise<CollectionResult> {
  if (!isStorefrontConfigured()) return { status: 'not-configured', collection: null }

  try {
    const data = await requestStorefront<{ collection: ShopifyCollection | null }>(COLLECTION_QUERY, { handle })
    return { status: 'ready', collection: data.collection }
  } catch {
    return { status: 'error', collection: null }
  }
}

export async function searchProducts(term: string): Promise<{ status: StorefrontStatus; products: ShopifyProduct[] }> {
  const normalizedTerm = term.trim().slice(0, 100)
  if (!isStorefrontConfigured()) return { status: 'not-configured', products: [] }
  if (!normalizedTerm) return { status: 'ready', products: [] }

  const underBudget = normalizedTerm.match(/^under\s*\$?\s*(\d{1,4})$/i)
  const storefrontQuery = underBudget ? `variants.price:<${underBudget[1]}` : normalizedTerm

  try {
    const data = await requestStorefront<{ products: { nodes: ShopifyProduct[] } }>(SEARCH_QUERY, {
      term: storefrontQuery,
    })
    const products = underBudget
      ? data.products.nodes.filter((product) => Number(product.priceRange.minVariantPrice.amount) < Number(underBudget[1]))
      : data.products.nodes
    return { status: 'ready', products }
  } catch {
    return { status: 'error', products: [] }
  }
}

export async function getShopPolicies(): Promise<{
  status: StorefrontStatus
  policies: ShopPolicies | null
}> {
  if (!isStorefrontConfigured()) return { status: 'not-configured', policies: null }

  try {
    const data = await requestStorefront<{ shop: ShopPolicies }>(POLICIES_QUERY)
    return { status: 'ready', policies: data.shop }
  } catch {
    return { status: 'error', policies: null }
  }
}

export function isDemoProduct(product: Pick<ShopifyProduct, 'tags'>) {
  const demoTags = new Set(['demo', 'sample', 'not-for-sale', 'pending-verification'])
  return product.tags.some((tag) => demoTags.has(tag.trim().toLowerCase()))
}

export function getSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  const value = configuredOrigin || (vercelDomain ? `https://${vercelDomain}` : null)
  if (!value) return null

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`)
    return url.protocol === 'https:' || url.hostname === 'localhost' ? url : null
  } catch {
    return null
  }
}
