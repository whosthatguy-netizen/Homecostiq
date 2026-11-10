'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { formatMoney } from '@/lib/shopify/presentation'
import { useCart } from '@/components/quirkello/cart-provider'

export function CartDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { cart, open, setOpen, changeCart, configured, isLoading } = useCart()
  const [message, setMessage] = useState('')
  const [busyLine, setBusyLine] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function updateLine(lineId: string, quantity: number) {
    setBusyLine(lineId)
    setMessage('')
    try {
      if (quantity < 1) {
        await changeCart({ intent: 'remove', lineId })
      } else {
        await changeCart({ intent: 'update', lineId, quantity })
      }
    } catch {
      setMessage('We could not update that item. Please try again.')
    } finally {
      setBusyLine('')
    }
  }

  function checkout() {
    if (!cart?.checkoutUrl) return
    const checkoutUrl = new URL(cart.checkoutUrl)
    checkoutUrl.searchParams.set('channel', 'online_store')
    if (window.self !== window.top) {
      window.open(checkoutUrl.toString(), '_blank', 'noopener,noreferrer')
    } else {
      window.location.assign(checkoutUrl.toString())
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="cart-title"
      onCancel={(event) => {
        event.preventDefault()
        setOpen(false)
      }}
      onClose={() => setOpen(false)}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-xl border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-foreground/35"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary"><ShoppingBag aria-hidden="true" /></span>
            <div>
              <h2 id="cart-title" className="font-serif text-2xl">Your bag</h2>
              <p className="text-sm text-muted-foreground">{cart?.totalQuantity ?? 0} {cart?.totalQuantity === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-full border border-border transition hover:bg-muted" aria-label="Close shopping bag">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          {message && <p role="alert" className="mb-4 rounded-2xl border border-border bg-muted px-4 py-3 text-sm">{message}</p>}
          {isLoading ? (
            <p className="py-12 text-center text-muted-foreground">Opening your bag…</p>
          ) : cart?.lines.nodes.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {cart.lines.nodes.map((line) => {
                const image = line.merchandise.product.featuredImage
                return (
                  <li key={line.id} className="flex gap-4 py-5">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
                      {image && <Image src={image.url} alt={image.altText || line.merchandise.product.title} fill sizes="96px" className="object-cover" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <a href={`/products/${line.merchandise.product.handle}`} onClick={() => setOpen(false)} className="font-semibold underline-offset-4 hover:underline">{line.merchandise.product.title}</a>
                          {line.merchandise.selectedOptions.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{line.merchandise.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(' · ')}</p>}
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{formatMoney(line.cost.totalAmount)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={busyLine === line.id} onClick={() => updateLine(line.id, line.quantity - 1)} className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-50" aria-label={`Remove one ${line.merchandise.product.title}`}><Minus className="size-4" aria-hidden="true" /></button>
                        <span aria-label={`Quantity ${line.quantity}`} className="min-w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                        <button type="button" disabled={busyLine === line.id || line.quantity >= 20} onClick={() => updateLine(line.id, line.quantity + 1)} className="flex size-9 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-50" aria-label={`Add one ${line.merchandise.product.title}`}><Plus className="size-4" aria-hidden="true" /></button>
                        <button type="button" disabled={busyLine === line.id} onClick={() => updateLine(line.id, 0)} className="ml-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50">Remove</button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-muted text-primary"><ShoppingBag className="size-7" aria-hidden="true" /></span>
              <h3 className="mt-5 font-serif text-2xl">Your bag is taking a breather.</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{configured ? 'When you find something unexpectedly awesome, it will show up here.' : 'The live Shopify bag is waiting for Storefront API setup.'}</p>
              <button type="button" onClick={() => setOpen(false)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground transition hover:bg-secondary">
                Keep exploring <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {cart?.lines.nodes.length ? (
          <footer className="border-t border-border bg-background px-5 py-5 sm:px-8">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span>{formatMoney(cart.cost.subtotalAmount)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cart.collectiveCheckoutEligible === false ? 'Remove gift cards or non-shippable items to continue. Shopify Collective checkout supports physical products only.' : 'Shipping and taxes are confirmed by Shopify at checkout.'}</p>
            <button type="button" onClick={checkout} disabled={!cart.checkoutUrl} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50">
              Continue to secure checkout <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Checkout and payment are handled by Shopify.</p>
          </footer>
        ) : null}
      </div>
    </dialog>
  )
}
