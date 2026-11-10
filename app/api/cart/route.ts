import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { requestStorefront, StorefrontNotConfiguredError, type ShopifyCart } from '@/lib/shopify/storefront'

export const runtime = 'nodejs'

const CART_COOKIE = 'quirkello_shopify_cart'
const MAX_LINE_QUANTITY = 20

const CartFields = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 50) {
    nodes {
      id
      quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          title
          availableForSale
          selectedOptions { name value }
          price { amount currencyCode }
          product {
            title
            handle
            featuredImage { url altText width height }
          }
        }
      }
    }
  }
`

const CART_QUERY = `query QuirkelloCart($cartId: ID!) { cart(id: $cartId) { ${CartFields} } }`
const CART_CREATE = `mutation QuirkelloCartCreate($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { ${CartFields} } userErrors { message } } }`
const CART_ADD = `mutation QuirkelloCartAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CartFields} } userErrors { message } } }`
const CART_UPDATE = `mutation QuirkelloCartUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CartFields} } userErrors { message } } }`
const CART_REMOVE = `mutation QuirkelloCartRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CartFields} } userErrors { message } } }`
const VARIANT_CHECK = `query QuirkelloVariantCheck($id: ID!) { node(id: $id) { ... on ProductVariant { product { id tags } } } }`
const CART_QUANTITIES = `query QuirkelloCartQuantities($cartId: ID!) { cart(id: $cartId) { lines(first: 50) { nodes { id quantity merchandise { ... on ProductVariant { product { id } } } } } } }`

const requestSchema = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal('add'), variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/[\w-]+$/), quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY) }),
  z.object({ intent: z.literal('update'), lineId: z.string().min(1).max(256), quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY) }),
  z.object({ intent: z.literal('remove'), lineId: z.string().min(1).max(256) }),
])

type MutationPayload = { cart: ShopifyCart | null; userErrors: { message: string }[] }

function withCheckoutChannel(cart: ShopifyCart | null) {
  if (!cart) return null
  try {
    const url = new URL(cart.checkoutUrl)
    if (url.protocol !== 'https:') return { ...cart, checkoutUrl: '' }
    url.searchParams.set('channel', 'online_store')
    return { ...cart, checkoutUrl: url.toString() }
  } catch {
    return { ...cart, checkoutUrl: '' }
  }
}

function cartResponse(cart: ShopifyCart | null, configured = true) {
  return { configured, cart: withCheckoutChannel(cart) }
}

async function saveCartId(cartId: string) {
  const cookieStore = await cookies()
  cookieStore.set(CART_COOKIE, cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

async function readCartId() {
  const cookieStore = await cookies()
  return cookieStore.get(CART_COOKIE)?.value ?? null
}

async function clearCartId() {
  const cookieStore = await cookies()
  cookieStore.delete(CART_COOKIE)
}

export async function GET() {
  if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    return NextResponse.json(cartResponse(null, false), { headers: { 'Cache-Control': 'private, no-store' } })
  }

  const cartId = await readCartId()
  if (!cartId) return NextResponse.json(cartResponse(null), { headers: { 'Cache-Control': 'private, no-store' } })

  try {
    const data = await requestStorefront<{ cart: ShopifyCart | null }>(CART_QUERY, { cartId }, 'no-store')
    if (!data.cart) await clearCartId()
    return NextResponse.json(cartResponse(data.cart), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to load the Shopify bag.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const requestOrigin = new URL(request.url).origin
  if (!origin || origin !== requestOrigin) {
    return NextResponse.json({ error: 'Request origin could not be verified.' }, { status: 403 })
  }

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'A valid JSON request is required.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) return NextResponse.json({ error: 'The requested cart change is not valid.' }, { status: 400 })
  if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Shopify checkout is not configured yet.' }, { status: 503 })
  }

  try {
    const change = parsed.data
    let cartId = await readCartId()
    let cart: ShopifyCart | null = null
    let userErrors: { message: string }[] = []

    if (change.intent === 'add') {
      const productData = await requestStorefront<{ node: { product: { id: string; tags: string[] } } | null }>(
        VARIANT_CHECK,
        { id: change.variantId },
        'no-store',
      )
      const product = productData.node?.product
      if (!product) return NextResponse.json({ error: 'That product variant is no longer available.' }, { status: 404 })
      const tags = product.tags
      if (tags.some((tag) => ['demo', 'sample', 'not-for-sale', 'pending-verification'].includes(tag.trim().toLowerCase()))) {
        return NextResponse.json({ error: 'This demo listing is not available for purchase.' }, { status: 409 })
      }

      if (cartId) {
        const current = await requestStorefront<{ cart: { lines: { nodes: { quantity: number; merchandise: { product: { id: string } } }[] } } | null }>(
          CART_QUANTITIES,
          { cartId },
          'no-store',
        )
        const currentQuantity = current.cart?.lines.nodes
          .filter((line) => line.merchandise.product.id === product.id)
          .reduce((total, line) => total + line.quantity, 0) ?? 0
        if (currentQuantity + change.quantity > MAX_LINE_QUANTITY) {
          return NextResponse.json({ error: `You can add up to ${MAX_LINE_QUANTITY} of this product per order.` }, { status: 400 })
        }
      }

      const lines = [{ merchandiseId: change.variantId, quantity: change.quantity }]
      if (cartId) {
        const data = await requestStorefront<{ cartLinesAdd: MutationPayload }>(CART_ADD, { cartId, lines }, 'no-store')
        cart = data.cartLinesAdd.cart
        userErrors = data.cartLinesAdd.userErrors
      } else {
        const data = await requestStorefront<{ cartCreate: MutationPayload }>(CART_CREATE, { lines }, 'no-store')
        cart = data.cartCreate.cart
        userErrors = data.cartCreate.userErrors
      }
    } else {
      if (!cartId) return NextResponse.json({ error: 'Your bag is empty.' }, { status: 404 })

      if (change.intent === 'update') {
        const current = await requestStorefront<{ cart: { lines: { nodes: { id: string; quantity: number; merchandise: { product: { id: string } } }[] } } | null }>(
          CART_QUANTITIES,
          { cartId },
          'no-store',
        )
        const targetLine = current.cart?.lines.nodes.find((line) => line.id === change.lineId)
        if (!targetLine) return NextResponse.json({ error: 'That bag item is no longer available.' }, { status: 404 })
        const otherProductQuantity = current.cart?.lines.nodes
          .filter((line) => line.id !== change.lineId && line.merchandise.product.id === targetLine.merchandise.product.id)
          .reduce((total, line) => total + line.quantity, 0) ?? 0
        if (otherProductQuantity + change.quantity > MAX_LINE_QUANTITY) {
          return NextResponse.json({ error: `You can add up to ${MAX_LINE_QUANTITY} of this product per order.` }, { status: 400 })
        }

        const data = await requestStorefront<{ cartLinesUpdate: MutationPayload }>(
          CART_UPDATE,
          { cartId, lines: [{ id: change.lineId, quantity: change.quantity }] },
          'no-store',
        )
        cart = data.cartLinesUpdate.cart
        userErrors = data.cartLinesUpdate.userErrors
      } else {
        const data = await requestStorefront<{ cartLinesRemove: MutationPayload }>(
          CART_REMOVE,
          { cartId, lineIds: [change.lineId] },
          'no-store',
        )
        cart = data.cartLinesRemove.cart
        userErrors = data.cartLinesRemove.userErrors
      }
    }

    if (userErrors.length || !cart) {
      return NextResponse.json({ error: userErrors[0]?.message || 'Shopify could not update the bag.' }, { status: 400 })
    }

    cartId = cart.id
    await saveCartId(cartId)
    return NextResponse.json(cartResponse(cart), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof StorefrontNotConfiguredError) {
      return NextResponse.json({ error: 'Shopify checkout is not configured yet.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Shopify could not update the bag. Please try again.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
