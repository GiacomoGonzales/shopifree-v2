import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import { getExpectedPayment, mpPaymentMismatch, markOrderPaid, markOrderFailed, markOrderRefunded, type OrderDoc } from './_shared/orderTotal.js'

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
      const accessToken = (await getPaymentSecrets(firestore, storeId, storeData)).mercadopago?.accessToken

      if (!accessToken) {
        console.error('[mp-webhook] No access token for store:', storeId)
        return res.status(200).end()
      }

      if (!/^\d{1,30}$/.test(String(paymentId))) {
        console.warn('[mp-webhook] invalid payment id:', paymentId)
        return res.status(200).end()
      }

      // Query MercadoPago for payment details. El body del webhook NO se usa:
      // la fuente de verdad es la API de MP con el token del comerciante.
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!mpResponse.ok) {
        console.error('[mp-webhook] Failed to fetch payment:', mpResponse.status)
        return res.status(200).end()
      }

      const payment = await mpResponse.json() as {
        status?: string
        external_reference?: string
        transaction_amount?: number
        currency_id?: string
      }
      const orderId = payment.external_reference
      const paymentStatus = payment.status // approved, pending, rejected, etc.

      console.log('[mp-webhook] Payment received:', {
        paymentId,
        orderId,
        status: paymentStatus,
        storeId
      })

      if (!orderId || typeof orderId !== 'string' || orderId.includes('/')) {
        console.warn('[mp-webhook] No external_reference (orderId) in payment')
        return res.status(200).end()
      }

      const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)
      const orderDoc = await orderRef.get()

      if (!orderDoc.exists) {
        console.error('[mp-webhook] Order not found:', orderId)
        return res.status(200).end()
      }
      const order = orderDoc.data() as OrderDoc

      // Transiciones acotadas (api/_shared/orderTotal.ts): pending|failed → paid,
      // pending → failed, paid → refunded. Un webhook viejo de un pago
      // rechazado nunca pasa a 'failed' un pedido ya pagado.
      if (paymentStatus === 'approved') {
        const expected = await getExpectedPayment(firestore, storeId, orderId, storeData || {}, order)
        const mismatch = mpPaymentMismatch(payment, orderId, expected,
          typeof storeData?.currency === 'string' ? storeData.currency : undefined)
        if (mismatch) {
          console.error('[mp-webhook] pago aprobado no coincide con el pedido:', { orderId, paymentId, mismatch })
          if (order.paymentStatus !== 'paid') {
            await orderRef.update({ paymentId: String(paymentId), paymentReview: `mp:${mismatch}`, updatedAt: new Date() })
          }
          return res.status(200).end()
        }
        const r = await markOrderPaid(firestore, storeId, orderId, { paymentId: String(paymentId), paymentMethod: 'mercadopago' })
        console.log('[mp-webhook] Order paid:', { orderId, result: r })
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        // Don't change order status - let the store owner decide
        const changed = await markOrderFailed(firestore, storeId, orderId, { paymentId: String(paymentId) })
        console.log('[mp-webhook] Order failed:', { orderId, changed })
      } else if (paymentStatus === 'refunded' || paymentStatus === 'charged_back') {
        // Solo si ESTE pago es el que pagó el pedido (no un pago viejo/duplicado)
        if (!order.paymentId || order.paymentId === String(paymentId)) {
          const changed = await markOrderRefunded(firestore, storeId, orderId)
          console.log('[mp-webhook] Order refunded:', { orderId, changed })
        }
      }
      // For 'pending', 'in_process', etc. - don't update, keep as is
    }

    // Always return 200 to MercadoPago (they retry on non-200)
    return res.status(200).end()
  } catch (error) {
    console.error('[mp-webhook] Error processing webhook:', error)
    // Return 200 even on error to prevent MercadoPago from retrying indefinitely
    return res.status(200).end()
  }
}
