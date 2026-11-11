import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Frequently asked questions', robots: { index: false, follow: true } }

const questions = [
  { question: 'Where do product prices and options come from?', answer: 'Product information, variants, prices, and availability are read from Shopify. If a product is not in the live catalog, it will not be shown as a purchasable item.' },
  { question: 'How is checkout handled?', answer: "When the catalog is ready, the bag sends you to Shopify's hosted checkout. Shopify recalculates the order total and confirms payment there." },
  { question: 'When will shipping be calculated?', answer: 'Shipping and taxes are confirmed during Shopify checkout after the required address information is provided. Store shipping rates still need to be configured before launch.' },
  { question: 'Where can I read the return and privacy policies?', answer: 'The policy pages on this site display the current policies published in Shopify. If a policy is missing, it is identified as a setup requirement rather than replaced with invented legal copy.' },
  { question: 'Are reviews verified?', answer: 'Customer-submitted reviews are approved by the store team before they appear. This system does not verify purchases.' },
]

export default function FAQPage() {
  return (
    <section className="mx-auto min-h-[60vh] max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">A few useful answers</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Frequently asked questions</h1>
      <div className="mt-8 divide-y divide-border rounded-[1.5rem] border border-border px-5 sm:px-8">
        {questions.map((item) => <details key={item.question} className="group py-5"><summary className="cursor-pointer list-none pr-8 font-semibold marker:hidden focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"><span className="flex items-center justify-between gap-4">{item.question}<span aria-hidden="true" className="text-xl text-secondary transition group-open:rotate-45">+</span></span></summary><p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{item.answer}</p></details>)}
      </div>
    </section>
  )
}
