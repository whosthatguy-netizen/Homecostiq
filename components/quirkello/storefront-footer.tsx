import Link from 'next/link'
import { ArrowUpRight, Sparkles } from 'lucide-react'

const policyLinks = [
  { title: 'Shipping', href: '/policies/shipping' },
  { title: 'Returns', href: '/policies/refunds' },
  { title: 'Privacy', href: '/policies/privacy' },
  { title: 'Terms', href: '/policies/terms' },
]

export function StorefrontFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-muted/55">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-serif text-2xl font-semibold" aria-label="Quirkello home">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary"><Sparkles className="size-4" aria-hidden="true" /></span>
            Quirkello<span className="text-secondary">.</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Unexpectedly awesome finds for curious people. Real listings, real variants, and Shopify checkout when the catalog is ready.</p>
        </div>
        <div className="flex flex-col gap-5 md:items-end">
          <nav aria-label="Policies and help" className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
            {policyLinks.map((link) => <Link key={link.href} href={link.href} className="underline-offset-4 hover:underline">{link.title}</Link>)}
            <Link href="/faq" className="underline-offset-4 hover:underline">FAQ</Link>
            <Link href="/contact" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">Contact <ArrowUpRight className="size-3" aria-hidden="true" /></Link>
          </nav>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Quirkello. Checkout is hosted by Shopify.</p>
        </div>
      </div>
    </footer>
  )
}
