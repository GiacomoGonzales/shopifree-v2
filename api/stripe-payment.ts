import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import Stripe from 'stripe'
import { hasPaidEffectivePlan, PLAN_REQUIRED_RESPONSE } from './_shared/plan.js'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import {
  loadPayableOrder, saveCheckout, checkIpRateLimit, checkStoreRateLimit, bumpCheckoutAttempts, getExpectedPayment, failBody,
  markOrderPaid, type OrderDoc,
} from './_shared/orderTotal.js'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

// Zero-decimal currencies (amount is already in smallest unit)
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga',
  'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'
])

function toSmallestUnit(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return Math.round(amount)
  }
  return Math.round(amount * 100)
}

/**
 * Verifica un PaymentIntent contra el pedido: metadata, moneda y monto.
 * null si coincide, o el motivo.
 */
function intentMismatch(
  pi: Stripe.PaymentIntent,
  storeId: string,
  orderId: string,
  expected: { payAmount: number; payCurrency: string } | null,
): string | null {
  if (pi.metadata?.storeId !== storeId || pi.metadata?.orderId !== orderId) return 'metadata'
  if (!expected) return 'unverifiable_order'
  if (pi.currency !== expected.payCurrency.toLowerCase()) return 'currency'
  if (pi.amount !== toSmallestUnit(expected.payAmount, expected.payCurrency)) return 'amount'
  return null
}

async function handleCreateIntent(req: VercelRequest, res: VercelResponse) {
  // amount/currency del cliente se IGNORAN: el monto sale del pedido
  // recalculado en el servidor (api/_shared/orderTotal.ts)
  const { storeId, orderId } = req.body as { storeId: string; orderId: string }

  if (!storeId || !orderId) {
    return res.status(400).json({ error: 'Missing required parameters: storeId, orderId' })
  }

  const firestore = getDb()
  const storeDoc = await firestore.collection('stores').doc(storeId).get()

  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const storeData = storeDoc.data()

  // Card payments are a paid feature — server-side gate (client is bypassable).
  if (!hasPaidEffectivePlan(storeData)) {
    return res.status(403).json(PLAN_REQUIRED_RESPONSE)
  }

  const stripeConfig = storeData?.payments?.stripe

  if (!stripeConfig?.enabled) {
    return res.status(400).json({ error: 'Stripe is not enabled for this store' })
  }

  // Secreto server-only (doc privado, con fallback al campo legacy)
  const stripeSecretKey = (await getPaymentSecrets(firestore, storeId, storeData)).stripe?.secretKey
  if (!stripeSecretKey) {
    return res.status(400).json({ error: 'Stripe secret key not configured' })
  }

  // Anti card-testing: límite por IP
  if (!(await checkIpRateLimit(firestore, req, 'stripe-intent'))) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
  }
  if (!(await checkStoreRateLimit(firestore, storeId, 'stripe-intent'))) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
  }

  // Pedido existente, pendiente, de Stripe, con total verificado en el servidor
  const payable = await loadPayableOrder(firestore, storeId, orderId, storeData || {}, 'stripe')
  if (!payable.ok) {
    return res.status(payable.status).json(failBody(payable))
  }
  const { pricing, checkout } = payable
  const amount = toSmallestUnit(pricing.total, pricing.currency)
  const currency = pricing.currency.toLowerCase()

  const stripe = new Stripe(stripeSecretKey)

  // Un PaymentIntent por pedido: si ya existe uno reutilizable con el mismo
  // monto, se devuelve ese (evita crear intents en masa para probar tarjetas)
  if (checkout?.stripePaymentIntentId) {
    try {
      const prev = await stripe.paymentIntents.retrieve(checkout.stripePaymentIntentId)
      if (prev.status === 'succeeded') {
        await markOrderPaid(firestore, storeId, orderId, { paymentId: prev.id, paymentMethod: 'stripe' })
        return res.status(409).json({ error: 'El pedido ya está pagado', code: 'already_paid' })
      }
      if (prev.status === 'processing') {
        return res.status(409).json({ error: 'El pago está en proceso', code: 'processing' })
      }
      const reusable = ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(prev.status)
      if (reusable && prev.amount === amount && prev.currency === currency) {
        return res.status(200).json({ clientSecret: prev.client_secret, paymentIntentId: prev.id })
      }
    } catch (err) {
      console.warn('[stripe-payment] could not reuse PaymentIntent:', err instanceof Error ? err.message : err)
    }
  }

  if (!(await bumpCheckoutAttempts(firestore, storeId, orderId, 'attempts', 5))) {
    return res.status(429).json({ error: 'Demasiados intentos para este pedido.' })
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata: { storeId, orderId },
    automatic_payment_methods: { enabled: true }
  })

  await saveCheckout(firestore, storeId, orderId, {
    gateway: 'stripe',
    amount: pricing.total,
    currency: pricing.currency,
    payAmount: pricing.total,
    payCurrency: pricing.currency,
    couponId: pricing.coupon?.id || null,
    stripePaymentIntentId: paymentIntent.id,
  })

  return res.status(200).json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  })
}

async function handleConfirmPayment(body: Record<string, unknown>, res: VercelResponse) {
  const { storeId, orderId, paymentIntentId } = body as {
    storeId: string; orderId: string; paymentIntentId: string
  }

  if (!storeId || !orderId || !paymentIntentId || !/^pi_[A-Za-z0-9]+$/.test(String(paymentIntentId))) {
    return res.status(400).json({ error: 'Missing required parameters: storeId, orderId, paymentIntentId' })
  }

  const firestore = getDb()
  const storeDoc = await firestore.collection('stores').doc(storeId).get()

  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const storeData = storeDoc.data() || {}
  // Secreto server-only (doc privado, con fallback al campo legacy)
  const stripeSecretKey = (await getPaymentSecrets(firestore, storeId, storeData)).stripe?.secretKey

  if (!stripeSecretKey) {
    return res.status(400).json({ error: 'Stripe not configured for this store' })
  }

  const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const orderSnap = await orderRef.get()
  if (!orderSnap.exists) {
    return res.status(404).json({ error: 'Order not found' })
  }
  const order = orderSnap.data() as OrderDoc

  const stripe = new Stripe(stripeSecretKey)
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  // Security check: metadata, monto y moneda contra lo que calculó el servidor
  const expected = await getExpectedPayment(firestore, storeId, orderId, storeData, order)
  const mismatch = intentMismatch(paymentIntent, storeId, orderId, expected)
  if (mismatch === 'metadata') {
    return res.status(403).json({ error: 'Payment metadata mismatch' })
  }

  if (paymentIntent.status === 'succeeded') {
    if (mismatch) {
      console.error('[stripe-payment] PaymentIntent no coincide con el pedido:', { orderId, paymentIntentId, mismatch })
      if (order.paymentStatus !== 'paid') {
        await orderRef.update({ paymentId: paymentIntentId, paymentReview: `stripe:${mismatch}`, updatedAt: new Date() })
      }
      // El pedido NO se marca pagado; el cliente ve "en proceso"
      return res.status(200).json({ status: 'processing', paymentId: paymentIntentId })
    }
    // pending|failed → paid; stock y cupón una sola vez
    await markOrderPaid(firestore, storeId, orderId, { paymentId: paymentIntentId, paymentMethod: 'stripe' })
  } else if (paymentIntent.status === 'processing') {
    if (order.paymentStatus !== 'paid') {
      await orderRef.update({
        paymentId: paymentIntentId,
        updatedAt: new Date()
      })
    }
  }

  return res.status(200).json({
    status: paymentIntent.status,
    paymentId: paymentIntentId
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action } = req.body as { action: string }

    if (action === 'create-intent') {
      return await handleCreateIntent(req, res)
    } else if (action === 'confirm-payment') {
      return await handleConfirmPayment(req.body, res)
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "create-intent" or "confirm-payment"' })
    }
  } catch (error) {
    console.error('[stripe-payment] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
