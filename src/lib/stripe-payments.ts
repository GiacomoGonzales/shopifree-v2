import { loadStripe, type Stripe } from '@stripe/stripe-js'

// Cache per-store Stripe instances (separate from platform key in lib/stripe.ts)
const stripeCache = new Map<string, Promise<Stripe | null>>()

export function getStoreStripe(publishableKey: string): Promise<Stripe | null> {
  if (!stripeCache.has(publishableKey)) {
    stripeCache.set(publishableKey, loadStripe(publishableKey))
  }
  return stripeCache.get(publishableKey)!
}

export async function createPaymentIntent(
  storeId: string,
  orderId: string,
  amount: number,
  currency: string
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const res = await fetch('/api/stripe-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create-intent', storeId, orderId, amount, currency })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to create payment intent')
  }

  return res.json()
}

export async function confirmStripePayment(
  storeId: string,
  orderId: string,
  paymentIntentId: string
): Promise<{ status: string; paymentId: string }> {
  const res = await fetch('/api/stripe-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'confirm-payment', storeId, orderId, paymentIntentId })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to confirm payment')
  }

  return res.json()
}
