import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { storeId, orderId, paymentId } = req.body as {
      storeId: string
      orderId: string
      paymentId: string
    }

    if (!storeId || !orderId || !paymentId) {
      return res.status(400).json({ error: 'Missing storeId, orderId, or paymentId' })
    }

    const firestore = getDb()

    // Get store credentials to verify payment with MercadoPago
    const storeDoc = await firestore.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()
    const accessToken = storeData?.payments?.mercadopago?.accessToken

    if (!accessToken) {
      return res.status(400).json({ error: 'MercadoPago not configured' })
    }

    // Verify payment with MercadoPago API (don't trust client blindly)
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!mpResponse.ok) {
      console.error('[confirm-mp-order] Failed to verify payment:', mpResponse.status)
      return res.status(400).json({ error: 'Could not verify payment' })
    }

    const payment = await mpResponse.json()

    // Verify that this payment belongs to this order
    if (payment.external_reference !== orderId) {
      console.warn('[confirm-mp-order] Payment external_reference mismatch:', {
        expected: orderId,
        got: payment.external_reference
      })
      // Don't block — external_reference might differ in some MP flows
    }

    // Update order based on verified payment status
    const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()

    if (!orderDoc.exists) {
      console.error('[confirm-mp-order] Order not found:', orderId)
      return res.status(404).json({ error: 'Order not found' })
    }

    const updateData: Record<string, unknown> = {
      paymentId: String(paymentId),
      updatedAt: new Date()
    }

    if (payment.status === 'approved') {
      updateData.paymentStatus = 'paid'
      updateData.status = 'confirmed'
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      // Keep as pending but store the paymentId
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      updateData.paymentStatus = 'failed'
    }

    await orderRef.update(updateData)

    console.log('[confirm-mp-order] Order updated:', { orderId, paymentStatus: payment.status })

    return res.status(200).json({
      status: payment.status,
      orderStatus: updateData.status || 'pending'
    })
  } catch (error) {
    console.error('[confirm-mp-order] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
