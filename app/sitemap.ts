import type { MetadataRoute } from 'next'
import { getHomeCatalog, getSiteOrigin, isDemoProduct } from '@/lib/shopify/storefront'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin()
  if (!origin) return []

  const catalog = await getHomeCatalog()
  if (catalog.status !== 'ready' || catalog.products.length === 0) return []

  const entries: MetadataRoute.Sitemap = [
    { url: new URL('/', origin).toString(), lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ]

  for (const product of catalog.products) {
    if (isDemoProduct(product) || !product.description.trim() || !product.featuredImage) continue
    entries.push({
      url: new URL(`/products/${product.handle}`, origin).toString(),
      lastModified: product.createdAt ? new Date(product.createdAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  for (const collection of catalog.collections) {
    if (!collection.description.trim() && collection.products.nodes.length === 0) continue
    entries.push({
      url: new URL(`/collections/${collection.handle}`, origin).toString(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
