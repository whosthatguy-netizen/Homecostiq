import type { Metadata } from 'next'
import { getShopPolicies } from '@/lib/shopify/storefront'
import { sanitizePolicyHtml } from '@/lib/shopify/sanitize-policy'

export const metadata: Metadata = { title: 'Contact Quirkello', robots: { index: false, follow: true } }

export default async function ContactPage() {
  const result = await getShopPolicies()
  const contact = result.policies?.contactInformation
  const shippingPolicy = result.policies?.shippingPolicy

  return (
    <section className="mx-auto min-h-[55vh] max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">We&rsquo;re here to help</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Contact Quirkello</h1>
      {contact ? (
        <div className="mt-6 rounded-[1.5rem] border border-border bg-muted/45 p-6"><h2 className="font-semibold">{contact.title || 'Store contact information'}</h2><div className="policy-content mt-3" dangerouslySetInnerHTML={{ __html: sanitizePolicyHtml(contact.body) }} />{contact.url && <a href={contact.url} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground">Visit contact page</a>}</div>
      ) : shippingPolicy?.body.includes('@') ? (
        <div className="mt-6 rounded-[1.5rem] border border-border bg-muted/45 p-6"><h2 className="font-serif text-2xl">Contact details appear in the store policy.</h2><p className="mt-3 leading-relaxed text-muted-foreground">See the current Shopify shipping policy for the contact information published by the store. The owner should verify that it is the right customer-support channel.</p><a href={shippingPolicy.url} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground">View shipping policy</a></div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-border bg-muted/45 p-6"><h2 className="font-serif text-2xl">Customer service details are not published yet.</h2><p className="mt-3 leading-relaxed text-muted-foreground">We won&rsquo;t invent an email address or phone number. Add verified contact details to Shopify before launch so customers know how to reach the store.</p></div>
      )}
    </section>
  )
}
