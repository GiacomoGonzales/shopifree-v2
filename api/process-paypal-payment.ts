import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import { getExpectedPayment, markOrderPaid, paypalAmountMismatch, type OrderDoc } from './_shared/orderTotal.js'
import { paypalFetch, type MerchantCredentials } from '../src/lib/paypal-server.js'

/**
 * Captures a PayPal order using the merchant's credentials, after the buyer
 * approved on PayPal's site and got redirected back to /payment/success.
 * Idempotent against the webhook (whichever runs first wins).
 *
 * Antes de capturar se lee la orden de PayPal con las credenciales del
 * comerciante y se exige custom_id === orderId y monto/moneda iguales a lo
 * que el servidor calculó al crearla (payment_checkouts). La captura también
 * se verifica antes de marcar el pedido pagado.
 *
 * Body: { storeId, orderId, paypalOrderId, action: 'capture' | 'verify' }
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
    custom_id?: string
    amount?: { value: string; currency_code: string }
    payments?: {
      captures?: { id: string; status: string; custom_id?: string; amount?: { value: string; currency_code: string } }[]
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
      payments?: {
        paypal?: {
          sandbox?: boolean
          clientId?: string
          clientSecret?: string
        }
      }
    }
    const pp = store.payments?.paypal
    // Secreto server-only (doc privado, con fallback al campo legacy)
    const ppSecret = (await getPaymentSecrets(db, storeId, store)).paypal?.clientSecret
    if (!pp?.clientId || !ppSecret) {
      return res.status(400).json({ error: 'Store does not have PayPal configured' })
    }

    const creds: MerchantCredentials = {
      clientId: pp.clientId,
      secret: ppSecret,
      env: pp.sandbox ? 'sandbox' : 'live',
    }
    const orderRef = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' })
    const orderData = orderSnap.data() as OrderDoc

    if (orderData.paymentStatus === 'paid') {
      return res.status(200).json({ ok: true, alreadyPaid: true, paid: true })
    }
    if (!/^[A-Za-z0-9-]{5,64}$/.test(paypalOrderId)) {
      return res.status(400).json({ error: 'Invalid paypalOrderId' })
    }

    const expected = await getExpectedPayment(db, storeId, orderId, store as Record<string, unknown>, orderData)
    if (!expected) {
      return res.status(409).json({ error: 'Order amount cannot be verified' })
    }

    // 1) Leer la orden de PayPal y validar que sea de ESTE pedido y por el
    //    monto correcto ANTES de capturar.
    const ppOrder = await paypalFetch<PayPalCaptureResponse>(creds, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`)
    const unit = ppOrder.purchase_units?.[0]
    const orderMismatch = paypalAmountMismatch(unit?.custom_id, unit?.amount, orderId, expected)
    if (orderMismatch) {
      console.warn('[process-paypal-payment] PayPal order does not match', { orderId, paypalOrderId, orderMismatch })
      return res.status(403).json({ error: 'PayPal order does not match this order' })
    }

    let response: PayPalCaptureResponse = ppOrder
    if (action !== 'verify' && ppOrder.status === 'APPROVED') {
      response = await paypalFetch<PayPalCaptureResponse>(creds, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
        method: 'POST',
        paypalRequestId: `${storeId}:${orderId}:capture:${paypalOrderId}`,
      })
    }

    // 2) Verificar la captura real (estado, monto, moneda)
    const capture = response.purchase_units?.[0]?.payments?.captures?.find(c => c.status === 'COMPLETED')
    if (capture) {
      const captureMismatch = paypalAmountMismatch(orderId, capture.amount, orderId, expected)
      if (captureMismatch) {
        console.error('[process-paypal-payment] capture amount mismatch', { orderId, paypalOrderId, captureMismatch })
        await orderRef.update({ paymentId: capture.id, paymentReview: `paypal:${captureMismatch}`, updatedAt: new Date() })
        return res.status(409).json({ ok: false, paid: false, error: 'Captured amount does not match' })
      }
      // pending|failed → paid; stock y cupón una sola vez (compartido con el webhook)
      await markOrderPaid(db, storeId, orderId, { paymentId: capture.id, paymentMethod: 'paypal' })
      return res.status(200).json({ ok: true, paid: true, paypalStatus: response.status })
    }

    return res.status(200).json({ ok: true, paid: false, paypalStatus: response.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('process-paypal-payment error:', err)
    return res.status(500).json({ error: message })
  }
}
