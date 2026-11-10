'use client'

import { createContext, useContext, useState } from 'react'
import useSWR from 'swr'
import type { ShopifyCart } from '@/lib/shopify/storefront'
import { CartDialog } from '@/components/quirkello/cart-dialog'

type CartEnvelope = {
  configured: boolean
  cart: ShopifyCart | null
}

type CartChange =
  | { intent: 'add'; variantId: string; quantity: number }
  | { intent: 'update'; lineId: string; quantity: number }
  | { intent: 'remove'; lineId: string }

type CartContextValue = {
  cart: ShopifyCart | null
  configured: boolean
  isLoading: boolean
  open: boolean
  setOpen: (open: boolean) => void
  changeCart: (change: CartChange) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

async function fetchCart(): Promise<CartEnvelope> {
  const response = await fetch('/api/cart', { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to read the shopping bag.')
  return response.json()
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, mutate } = useSWR<CartEnvelope>('/api/cart', fetchCart, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  async function changeCart(change: CartChange) {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(change),
    })

    const result = (await response.json()) as CartEnvelope & { error?: string }
    if (!response.ok) throw new Error(result.error || 'We could not update your bag.')

    await mutate(result, false)
  }

  return (
    <CartContext.Provider
      value={{
        cart: data?.cart ?? null,
        configured: data?.configured ?? false,
        isLoading,
        open,
        setOpen,
        changeCart,
      }}
    >
      {children}
      <CartDialog />
    </CartContext.Provider>
  )
}

export function useCart() {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside CartProvider.')
  return value
}
