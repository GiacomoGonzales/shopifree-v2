import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { paypalFetch, type PayPalEnv } from '../src/lib/paypal-server.js'

/**
 * Captures a PayPal order after the customer approved it on PayPal's site
 * and got redirected back to /payment/success. Idempotent against the
 * webhook (whichever runs first wins; the second is a no-op once the
 * Firestore order is already 'paid').
 *
 * Body: { storeId, orderId, paypalOrderId, action: 'capture' | 'verify' }
 *
 *   capture → calls /v2/checkout/orders/{id}/capture (the actual payment).
 *   verify  → just reads /v2/checkout/orders/{id} to confirm status.
 *
 * No auth — public storefront. Tied to a specific store + Firestore order
 * by id; the route validates the paypalOrderId belongs to that order
 * before mutating anything.
 */

if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}
const db = getFirestore()

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

interface PayPalCaptureResponse {
  id: string
  status: string
  purchase_units?: {
    reference_id?: string
    payments?: {
      captures?: { id: string; status: string; amount?: { value: string; currency_code: string } }[]
    }
  }[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { storeId, orderId, paypalOrderId, action = 'capture' } = req.body as {
      storeId?: string
      orderId?: string
      paypalOrderId?: string
      action?: 'capture' | 'verify'
    }
    if (!storeId || !orderId || !paypalOrderId) {
      return res.status(400).json({ error: 'Missing storeId, orderId or paypalOrderId' })
    }

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const store = storeSnap.data() as {
      payments?: { paypal?: { sandbox?: boolean; merchantId?: string } }
    }
    const pp = store.payments?.paypal
    if (!pp?.merchantId) {
      return res.status(400).json({ error: 'Store does not have PayPal connected' })
    }

    const env: PayPalEnv = pp.sandbox ? 'sandbox' : 'live'
    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' })
    const orderData = orderSnap.data() as { paymentStatus?: string }

    // Idempotency: if the webhook already marked it paid, just confirm.
    if (orderData.paymentStatus === 'paid') {
      return res.status(200).json({ ok: true, alreadyPaid: true })
    }

    let response: PayPalCaptureResponse
    if (action === 'verify') {
      response = await paypalFetch<PayPalCaptureResponse>(env, `/v2/checkout/orders/${paypalOrderId}`, {
        sellerMerchantId: pp.merchantId,
      })
    } else {
      response = await paypalFetch<PayPalCaptureResponse>(env, `/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        sellerMerchantId: pp.merchantId,
        paypalRequestId: `${storeId}:${orderId}:capture`,
      })
    }

    const isPaid = response.status === 'COMPLETED' ||
      (response.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED')

    if (isPaid) {
      const captureId = response.purchase_units?.[0]?.payments?.captures?.[0]?.id
      await orderRef.update({
        paymentStatus: 'paid',
        status: 'confirmed',
        paymentMethod: 'paypal',
        paymentId: captureId || paypalOrderId,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      return res.status(200).json({ ok: true, paid: true, paypalStatus: response.status })
    }

    return res.status(200).json({ ok: true, paid: false, paypalStatus: response.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('process-paypal-payment error:', err)
    return res.status(500).json({ error: message })
  }
}
