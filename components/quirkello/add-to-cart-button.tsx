'use client'

import { useState } from 'react'
import { ArrowRight, Check, ShoppingBag } from 'lucide-react'
import { useCart } from '@/components/quirkello/cart-provider'

export function AddToCartButton({ variantId, available, demo }: { variantId: string | null; available: boolean; demo: boolean }) {
  const { changeCart, setOpen, configured } = useCart()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const disabled = busy || !variantId || !available || demo || !configured

  async function addToBag() {
    if (disabled || !variantId) return
    setBusy(true)
    setMessage('')
    try {
      await changeCart({ intent: 'add', variantId, quantity: 1 })
      setOpen(true)
    } catch {
      setMessage('We could not add this item right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const label = demo
    ? 'Demo listing — not for sale'
    : !configured
      ? 'Shopify checkout is being connected'
      : !variantId
        ? 'Choose an available option'
        : !available
          ? 'Currently unavailable'
          : busy
            ? 'Adding to bag…'
            : 'Add to bag'

  return (
    <div>
      <button type="button" disabled={disabled} onClick={addToBag} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">
        {busy ? <Check className="size-5" aria-hidden="true" /> : <ShoppingBag className="size-5" aria-hidden="true" />}
        {label}
        {!disabled && <ArrowRight className="size-4" aria-hidden="true" />}
      </button>
      {message && <p role="alert" className="mt-3 text-sm text-primary">{message}</p>}
    </div>
  )
}
