import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import Stripe from 'stripe'

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

async function handleCreateIntent(body: Record<string, unknown>, res: VercelResponse) {
  const { storeId, orderId, amount, currency } = body as {
    storeId: string; orderId: string; amount: number; currency: string
  }

  if (!storeId || !orderId || !amount || !currency) {
    return res.status(400).json({ error: 'Missing required parameters: storeId, orderId, amount, currency' })
  }

  const firestore = getDb()
  const storeDoc = await firestore.collection('stores').doc(storeId).get()

  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const storeData = storeDoc.data()
  const stripeConfig = storeData?.payments?.stripe

  if (!stripeConfig?.enabled) {
    return res.status(400).json({ error: 'Stripe is not enabled for this store' })
  }

  if (!stripeConfig.secretKey) {
    return res.status(400).json({ error: 'Stripe secret key not configured' })
  }

  const stripe = new Stripe(stripeConfig.secretKey)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: toSmallestUnit(amount, currency),
    currency: currency.toLowerCase(),
    metadata: { storeId, orderId },
    automatic_payment_methods: { enabled: true }
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

  if (!storeId || !orderId || !paymentIntentId) {
    return res.status(400).json({ error: 'Missing required parameters: storeId, orderId, paymentIntentId' })
  }

  const firestore = getDb()
  const storeDoc = await firestore.collection('stores').doc(storeId).get()

  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const storeData = storeDoc.data()
  const stripeConfig = storeData?.payments?.stripe

  if (!stripeConfig?.secretKey) {
    return res.status(400).json({ error: 'Stripe not configured for this store' })
  }

  const stripe = new Stripe(stripeConfig.secretKey)
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  // Security check: verify metadata matches
  if (paymentIntent.metadata.storeId !== storeId || paymentIntent.metadata.orderId !== orderId) {
    return res.status(403).json({ error: 'Payment metadata mismatch' })
  }

  // Update order based on payment status
  const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)

  if (paymentIntent.status === 'succeeded') {
    await orderRef.update({
      paymentStatus: 'paid',
      status: 'confirmed',
      paymentId: paymentIntentId,
      updatedAt: new Date()
    })
  } else if (paymentIntent.status === 'processing') {
    await orderRef.update({
      paymentId: paymentIntentId,
      updatedAt: new Date()
    })
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
      return await handleCreateIntent(req.body, res)
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
