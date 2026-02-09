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
  // MercadoPago sends both GET and POST notifications
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(200).end()
  }

  try {
    const topic = req.query.topic || req.body?.topic || req.body?.type
    const storeId = req.query.storeId as string

    // MercadoPago sends different notification types
    // We only care about payment notifications
    if (topic === 'payment' || topic === 'payment.updated') {
      const paymentId = req.query.id || req.body?.data?.id

      if (!paymentId) {
        console.warn('[mp-webhook] No payment ID in notification')
        return res.status(200).end()
      }

      if (!storeId) {
        console.warn('[mp-webhook] No storeId in query params')
        return res.status(200).end()
      }

      // Get store's MercadoPago credentials to query the payment
      const firestore = getDb()
      const storeDoc = await firestore.collection('stores').doc(storeId).get()

      if (!storeDoc.exists) {
        console.error('[mp-webhook] Store not found:', storeId)
        return res.status(200).end()
      }

      const storeData = storeDoc.data()
      const accessToken = storeData?.payments?.mercadopago?.accessToken

      if (!accessToken) {
        console.error('[mp-webhook] No access token for store:', storeId)
        return res.status(200).end()
      }

      // Query MercadoPago for payment details
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!mpResponse.ok) {
        console.error('[mp-webhook] Failed to fetch payment:', mpResponse.status)
        return res.status(200).end()
      }

      const payment = await mpResponse.json()
      const orderId = payment.external_reference
      const paymentStatus = payment.status // approved, pending, rejected, etc.

      console.log('[mp-webhook] Payment received:', {
        paymentId,
        orderId,
        status: paymentStatus,
        storeId
      })

      if (!orderId) {
        console.warn('[mp-webhook] No external_reference (orderId) in payment')
        return res.status(200).end()
      }

      // Update order in Firestore based on payment status
      const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)
      const orderDoc = await orderRef.get()

      if (!orderDoc.exists) {
        console.error('[mp-webhook] Order not found:', orderId)
        return res.status(200).end()
      }

      const updateData: Record<string, unknown> = {
        paymentId: String(paymentId),
        updatedAt: new Date()
      }

      if (paymentStatus === 'approved') {
        updateData.paymentStatus = 'paid'
        updateData.status = 'confirmed'
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        updateData.paymentStatus = 'failed'
        // Don't change order status - let the store owner decide
      }
      // For 'pending', 'in_process', etc. - don't update, keep as is

      await orderRef.update(updateData)

      console.log('[mp-webhook] Order updated:', { orderId, ...updateData })
    }

    // Always return 200 to MercadoPago (they retry on non-200)
    return res.status(200).end()
  } catch (error) {
    console.error('[mp-webhook] Error processing webhook:', error)
    // Return 200 even on error to prevent MercadoPago from retrying indefinitely
    return res.status(200).end()
  }
}
