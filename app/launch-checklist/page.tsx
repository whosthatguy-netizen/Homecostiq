import type { Metadata } from 'next'
import { getHomeCatalog, getShopPolicies, isStorefrontConfigured } from '@/lib/shopify/storefront'

export const metadata: Metadata = {
  title: 'Internal launch checklist',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function LaunchChecklistPage() {
  const [catalog, policiesResult] = await Promise.all([getHomeCatalog(), getShopPolicies()])
  const policies = policiesResult.policies
  const storefrontReady = isStorefrontConfigured()
  const productCount = catalog.status === 'ready' ? catalog.products.length : null

  const items = [
    { title: 'Shopify Admin integration', status: 'Connected in v0', detail: 'Admin API access is connected. Store name and primary domain were verified.' },
    { title: 'Storefront API credentials', status: storefrontReady ? 'Configured in runtime' : 'Missing from runtime', detail: storefrontReady ? 'Server-side Storefront requests are enabled.' : 'SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN were not present in the project environment after rechecking the connected integration.' },
    { title: 'Live Shopify catalog', status: productCount === null ? 'Not readable' : `${productCount} products`, detail: productCount === 0 ? 'Admin API returned an empty catalog. No fake/demo products are shown in the public storefront.' : productCount === null ? 'Storefront credentials or API access must be fixed before inventory and pricing can be validated.' : 'Product pages read titles, images, variants, prices, and availability from Shopify.' },
    { title: 'Vercel Storefronts publication', status: 'Found in Shopify', detail: 'The connected store exposes a “Vercel Storefronts” publication. Products still need to be published to the correct channel.' },
    { title: 'TikTok Shop', status: 'Not verified', detail: 'The Shopify Admin API scope available here could not inspect installed apps. Complete account authorization and product approval through the official Shopify/TikTok setup; do not bypass platform review.' },
    { title: 'Shipping rates and warehouse', status: 'Needs store-owner verification', detail: 'Rates, warehouse location, fulfillment rules, and delivery promises must be checked in Shopify before orders are accepted.' },
    { title: 'Policies', status: policiesResult.status === 'ready' ? 'Read from Shopify' : 'Not readable', detail: policiesResult.status === 'ready' ? `Shipping: ${policies?.shippingPolicy ? 'published' : 'missing'} · Returns: ${policies?.refundPolicy ? 'published' : 'missing'} · Privacy: ${policies?.privacyPolicy ? 'published' : 'missing'} · Terms: ${policies?.termsOfService ? 'published' : 'missing'}` : 'Shopify policies could not be read by the Storefront API yet.' },
    { title: 'Customer contact details', status: policies?.contactInformation ? 'Published in Shopify' : policies?.shippingPolicy?.body.includes('@') ? 'Listed in shipping policy' : 'Needs verification', detail: policies?.contactInformation ? 'Contact details are sourced from Shopify.' : policies?.shippingPolicy?.body.includes('@') ? 'A contact address appears in the shipping policy; confirm it is the intended customer-support channel.' : 'Add and verify customer service contact information in Shopify.' },
    { title: 'Reviews and product footage', status: 'Not connected', detail: 'Only verified review data and licensed Shopify-hosted video will be shown. No reviews, popularity, or supplier footage are fabricated.' },
    { title: 'Order tracking', status: 'Shopify checkout only', detail: 'Order confirmation and status are handled by Shopify checkout. A custom order-lookup experience is not connected.' },
  ]

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Internal · noindex</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Quirkello launch checklist</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">A factual readiness snapshot. This page does not expose credentials and is not linked in the shopper navigation. It is not password-protected; enable deployment protection before using it on a public production domain.</p>
      <ul className="mt-8 divide-y divide-border rounded-[1.5rem] border border-border bg-card px-5 sm:px-8">
        {items.map((item) => <li key={item.title} className="grid gap-2 py-5 sm:grid-cols-[0.8fr_0.45fr_1.2fr] sm:items-start sm:gap-5"><h2 className="font-semibold">{item.title}</h2><p className="text-sm font-semibold text-secondary">{item.status}</p><p className="text-sm leading-relaxed text-muted-foreground">{item.detail}</p></li>)}
      </ul>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Verified against the connected v0 Shopify integration on November 9, 2026. Store policies, product data, inventory, shipping, and channel configuration can change in Shopify; recheck them before launch.</p>
    </section>
  )
}
