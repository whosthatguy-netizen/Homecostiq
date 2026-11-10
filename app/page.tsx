import type { Metadata } from 'next'
import { StorefrontHome } from '@/components/quirkello/storefront-home'
import { getHomeCatalog, getSiteOrigin, isDemoProduct } from '@/lib/shopify/storefront'

export async function generateMetadata(): Promise<Metadata> {
  const catalog = await getHomeCatalog()
  const origin = getSiteOrigin()
  return {
    alternates: origin ? { canonical: new URL('/', origin).toString() } : undefined,
    robots: { index: catalog.status === 'ready' && catalog.products.some((product) => !isDemoProduct(product) && product.description.trim() && product.featuredImage), follow: true },
  }
}

export default async function HomePage() {
  const catalog = await getHomeCatalog()
  return <StorefrontHome catalog={catalog} />
}
