import { DM_Sans, Fraunces } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/components/quirkello/cart-provider'
import { StorefrontShell } from '@/components/quirkello/storefront-shell'
import { getSiteOrigin, isStorefrontConfigured } from '@/lib/shopify/storefront'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })
const siteOrigin = getSiteOrigin()

export const metadata: Metadata = {
  metadataBase: siteOrigin ?? undefined,
  title: {
    default: 'Quirkello — Unexpectedly awesome.',
    template: '%s | Quirkello',
  },
  description: 'Unusual toys, satisfying gadgets, clever desk finds, and gifts for curious people.',
  applicationName: 'Quirkello',
  generator: 'v0.app',
  robots: {
    index: isStorefrontConfigured(),
    follow: true,
  },
  openGraph: {
    type: 'website',
    siteName: 'Quirkello',
    title: 'Quirkello — Unexpectedly awesome.',
    description: 'Unusual toys, satisfying gadgets, clever desk finds, and gifts for curious people.',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F8F5ED',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable} bg-background`}>
      <body className="font-sans antialiased">
        <CartProvider>
          <StorefrontShell>{children}</StorefrontShell>
        </CartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
