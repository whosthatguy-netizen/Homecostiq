import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getHomeCatalog, getShopPolicies, isStorefrontConfigured } from '@/lib/shopify/storefront'

export const metadata: Metadata = {
  title: 'Internal store readiness',
  robots: { index: false, follow: false, noarchive: true },
}

const collectiveRequirements = [
  {
    title: 'Active Shopify plan',
    detail: 'Confirm the store is on an active plan. Pause and Build is not compatible with Shopify Collective.',
  },
  {
    title: 'Supported country and currency',
    detail: 'Confirm the business location and store currency are supported, and that each supplier connection is in the same country and currency.',
  },
  {
    title: 'Shopify Payments and payouts',
    detail: 'Complete Shopify Payments setup, confirm payouts are active, and verify the payout currency matches the store currency.',
  },
  {
    title: 'Tax and VAT setup',
    detail: 'For UK and EU businesses, use Shopify Tax, Basic Tax, or a compatible third-party tax app—not Manual Tax—and verify VAT details when registration is required.',
  },
  {
    title: 'Terms, policies, and verification',
    detail: 'Accept Collective’s Terms of Service, follow Shopify’s Terms of Service and Acceptable Use Policy, meet trust, safety, and fraud requirements, and complete ID checks if requested.',
  },
  {
    title: 'Network Intelligence',
    detail: 'Confirm Shopify Network Intelligence is activated for the store.',
  },
  {
    title: 'Supported product types',
    detail: 'Collective does not support digital products or gift cards. This storefront hides gift cards and variants that do not require shipping.',
  },
]

export default async function LaunchChecklistPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const [catalog, policiesResult] = await Promise.all([getHomeCatalog(), getShopPolicies()])
  const policies = policiesResult.policies
  const storefrontReady = isStorefrontConfigured()

  const storefrontChecks = [
    {
      title: 'Shopify Storefront API',
      status: storefrontReady ? 'Configured' : 'Not configured',
      detail: storefrontReady
        ? 'Server-side catalog and policy requests are enabled.'
        : 'Set up the connected Shopify Storefront API before publishing the storefront.',
    },
    {
      title: 'Eligible catalog listings',
      status: catalog.status === 'ready' ? `${catalog.products.length} Collective-eligible in first 24` : 'Not readable',
      detail: catalog.status === 'ready'
        ? `${catalog.excludedProductCount} gift-card or non-shippable listing(s) excluded from the first 24 results. Shopify is the source of truth for products, prices, variants, and availability.`
        : 'Fix Storefront API access before validating published products.',
    },
    {
      title: 'Shop policies',
      status: policiesResult.status === 'ready' ? 'Readable from Shopify' : 'Not readable',
      detail: policiesResult.status === 'ready'
        ? `Shipping: ${policies?.shippingPolicy?.body ? 'published' : 'missing'} · Returns: ${policies?.refundPolicy?.body ? 'published' : 'missing'} · Privacy: ${policies?.privacyPolicy?.body ? 'published' : 'missing'} · Terms: ${policies?.termsOfService?.body ? 'published' : 'missing'} · Contact: ${policies?.contactInformation?.body ? 'published' : 'missing'}`
        : 'Shopify policy data could not be read through the Storefront API.',
    },
  ]

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Internal · noindex</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Store readiness</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">This is a development-only readiness view, not proof of Shopify Collective eligibility. Account status, payouts, tax setup, supplier matching, and trust reviews must be checked in Shopify Admin.</p>

      <section className="mt-8" aria-labelledby="storefront-checks-heading">
        <h2 id="storefront-checks-heading" className="font-serif text-2xl">Storefront checks</h2>
        <ul className="mt-4 divide-y divide-border rounded-[1.5rem] border border-border bg-card px-5 sm:px-8">
          {storefrontChecks.map((item) => (
            <li key={item.title} className="grid gap-2 py-5 sm:grid-cols-[0.8fr_0.55fr_1.2fr] sm:items-start sm:gap-5">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm font-semibold text-secondary">{item.status}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="collective-checks-heading">
        <h2 id="collective-checks-heading" className="font-serif text-2xl">Shopify Collective: verify in Admin</h2>
        <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">The Storefront API cannot verify these account-level requirements. Check the current eligibility state in Shopify Admin → Apps → Collective → Check requirements.</p>
        <ul className="mt-4 divide-y divide-border rounded-[1.5rem] border border-border bg-card px-5 sm:px-8">
          {collectiveRequirements.map((item) => (
            <li key={item.title} className="grid gap-2 py-5 sm:grid-cols-[0.75fr_1.5fr_0.55fr] sm:items-start sm:gap-5">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              <p className="text-sm font-semibold text-secondary">Verify in Admin</p>
            </li>
          ))}
        </ul>
        <Link href="https://help.shopify.com/en/manual/online-sales-channels/shopify-collective/retailers/requirements-and-considerations" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-muted">
          Read Shopify Collective requirements
        </Link>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">Shopify can change eligibility and policies at any time. If Shopify marks the store ineligible, imported Collective products can’t be sold until the account is eligible again.</p>
    </section>
  )
}
