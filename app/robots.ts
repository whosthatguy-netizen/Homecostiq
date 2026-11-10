import type { MetadataRoute } from 'next'
import { getSiteOrigin, isStorefrontConfigured } from '@/lib/shopify/storefront'

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/launch-checklist', '/api/'],
    },
    ...(isStorefrontConfigured() && origin ? { sitemap: new URL('/sitemap.xml', origin).toString() } : {}),
  }
}
