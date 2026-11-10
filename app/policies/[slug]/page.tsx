import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getShopPolicies, type ShopPolicy } from '@/lib/shopify/storefront'
import { sanitizePolicyHtml } from '@/lib/shopify/sanitize-policy'

const policyMap: Record<string, { title: string; key: 'shippingPolicy' | 'refundPolicy' | 'privacyPolicy' | 'termsOfService' }> = {
  shipping: { title: 'Shipping policy', key: 'shippingPolicy' },
  refunds: { title: 'Refund and returns policy', key: 'refundPolicy' },
  privacy: { title: 'Privacy policy', key: 'privacyPolicy' },
  terms: { title: 'Terms of service', key: 'termsOfService' },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: policyMap[slug]?.title ?? 'Store policy', robots: { index: false, follow: true } }
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const policy = policyMap[slug]
  if (!policy) return <PolicyNotice title="Policy not found" body="Choose one of the store policies from the footer." />

  const result = await getShopPolicies()
  const publishedPolicy: ShopPolicy | null = result.policies?.[policy.key] ?? null
  if (publishedPolicy) {
    return <article className="mx-auto min-h-[55vh] max-w-3xl px-5 py-12 sm:px-8 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Quirkello policies</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">{publishedPolicy.title || policy.title}</h1><div className="policy-content mt-5" dangerouslySetInnerHTML={{ __html: sanitizePolicyHtml(publishedPolicy.body) }} /><a href={publishedPolicy.url} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">View the Shopify policy page <ArrowUpRight className="size-4" aria-hidden="true" /></a></article>
  }

  return <PolicyNotice title={policy.title} body={result.status === 'ready' ? 'This policy is not published in the connected Shopify store yet. Add the current store-approved policy in Shopify before accepting orders.' : 'Policy text will be read from Shopify once Storefront access is configured. Do not accept orders until the current store-approved policy is published.'} />
}

function PolicyNotice({ title, body }: { title: string; body: string }) {
  return <section className="mx-auto flex min-h-[55vh] max-w-3xl flex-col justify-center px-5 py-12 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Quirkello policies</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">{title}</h1><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{body}</p><Link href="/" className="mt-7 w-fit rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-muted">Back to Quirkello</Link></section>
}
