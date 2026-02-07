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

interface RequestBody {
  storeId: string
  orderId: string
  amount: number
  currency: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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
    const { storeId, orderId, amount, currency } = req.body as RequestBody

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
  } catch (error) {
    console.error('[create-stripe-intent] Error:', error)
    return res.status(500).json({ error: 'Failed to create Stripe PaymentIntent' })
  }
}
