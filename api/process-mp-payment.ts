import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { randomUUID } from 'crypto'

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
  formData: Record<string, unknown>
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
    const { storeId, orderId, formData } = req.body as RequestBody

    if (!storeId || !orderId || !formData) {
      return res.status(400).json({ error: 'Missing required parameters: storeId, orderId, formData' })
    }

    // Get store's MercadoPago credentials from Firestore
    const firestore = getDb()
    const storeDoc = await firestore.collection('stores').doc(storeId).get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()
    const mpConfig = storeData?.payments?.mercadopago

    if (!mpConfig?.enabled || !mpConfig.accessToken) {
      return res.status(400).json({ error: 'MercadoPago is not configured for this store' })
    }

    // Process the payment via MercadoPago Payments API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpConfig.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(formData)
    })

    const paymentResult = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('[process-mp-payment] MercadoPago API error:', {
        status: mpResponse.status,
        error: paymentResult
      })
      return res.status(mpResponse.status).json({
        error: paymentResult.message || 'Payment processing failed',
        status: 'rejected',
        status_detail: paymentResult.cause?.[0]?.code || 'unknown'
      })
    }

    // Update Firestore order based on payment result
    const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)

    if (paymentResult.status === 'approved') {
      await orderRef.update({
        paymentStatus: 'paid',
        paymentId: String(paymentResult.id),
        status: 'confirmed',
        updatedAt: new Date()
      })
    } else if (paymentResult.status === 'in_process' || paymentResult.status === 'pending') {
      await orderRef.update({
        paymentId: String(paymentResult.id),
        updatedAt: new Date()
      })
    }
    // rejected → keep order as pending, don't update paymentId

    return res.status(200).json({
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      payment_id: paymentResult.id
    })
  } catch (error) {
    console.error('[process-mp-payment] Error:', error)
    return res.status(500).json({ error: 'Failed to process payment' })
  }
}
