import type { ReactNode } from 'react'
import { StorefrontHeader } from '@/components/quirkello/storefront-header'
import { StorefrontFooter } from '@/components/quirkello/storefront-footer'

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-background focus:px-4 focus:py-3 focus:font-semibold focus:text-foreground">Skip to content</a>
      <StorefrontHeader />
      <main id="main-content" className="min-h-screen">{children}</main>
      <StorefrontFooter />
    </>
  )
}
