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

interface RequestBody {
  storeId: string
  orderId: string
  paymentIntentId: string
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
    const { storeId, orderId, paymentIntentId } = req.body as RequestBody

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
  } catch (error) {
    console.error('[confirm-stripe-payment] Error:', error)
    return res.status(500).json({ error: 'Failed to confirm Stripe payment' })
  }
}
