import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { randomUUID } from 'crypto'
import { hasPaidEffectivePlan, PLAN_REQUIRED_RESPONSE } from './_shared/plan.js'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import {
  loadPayableOrder, saveCheckout, checkIpRateLimit, checkStoreRateLimit, bumpCheckoutAttempts, getExpectedPayment,
  mpPaymentMismatch, markOrderPaid, markOrderFailed, type OrderDoc,
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

interface RequestBody {
  storeId: string
  orderId: string
  formData?: Record<string, unknown>
  action?: 'confirm' | 'status'
  paymentId?: string
}

interface MpPayment {
  id?: number | string
  status?: string
  status_detail?: string
  transaction_amount?: number
  currency_id?: string
  external_reference?: string
}

// Campos del formData del Brick que NUNCA se aceptan del cliente: el monto y
// la referencia los pone el servidor, y los de marketplace/fees no aplican.
const BLOCKED_FORM_FIELDS = new Set([
  'transaction_amount', 'external_reference', 'notification_url', 'metadata',
  'application_fee', 'marketplace', 'marketplace_fee', 'sponsor_id', 'coupon_amount',
  'coupon_code', 'campaign_id', 'differential_pricing_id', 'capture', 'callback_url',
])

function webhookUrlFor(storeId: string): string {
  const webhookBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.APP_URL || 'https://shopifree.app'
  return `${webhookBase}/api/mp-webhook?storeId=${encodeURIComponent(storeId)}`
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
    const { storeId, orderId, formData, action, paymentId } = req.body as RequestBody

    // Route: confirm order after Checkout Pro redirect
    if (action === 'confirm') {
      return handleConfirmOrder(res, storeId, orderId, paymentId)
    }

    // Route: estado del pago (la página de éxito espera la confirmación real)
    if (action === 'status') {
      return handleOrderStatus(res, storeId, orderId)
    }

    if (!storeId || !orderId || !formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Missing required parameters: storeId, orderId, formData' })
    }

    // Get store's MercadoPago credentials from Firestore
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

    const mpConfig = storeData?.payments?.mercadopago

    // Secreto server-only (doc privado, con fallback al campo legacy)
    const mpAccessToken = (await getPaymentSecrets(firestore, storeId, storeData)).mercadopago?.accessToken
    if (!mpConfig?.enabled || !mpAccessToken) {
      return res.status(400).json({ error: 'MercadoPago is not configured for this store' })
    }

    // Anti card-testing: límite por IP + intentos de pago por pedido
    if (!(await checkIpRateLimit(firestore, req, 'mp-payment', 20))) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.', status: 'rejected', status_detail: 'cc_rejected_max_attempts' })
    }
    if (!(await checkStoreRateLimit(firestore, storeId, 'mp-payment'))) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.', status: 'rejected', status_detail: 'cc_rejected_max_attempts' })
    }

    // Monto calculado en el servidor (pedido existente, pendiente, total verificado)
    const payable = await loadPayableOrder(firestore, storeId, orderId, storeData || {}, 'mercadopago')
    if (!payable.ok) {
      return res.status(payable.status).json({ error: payable.error, code: payable.code, status: 'rejected', status_detail: payable.code })
    }
    const { pricing, order } = payable

    if (!(await bumpCheckoutAttempts(firestore, storeId, orderId, 'paymentAttempts', 8))) {
      return res.status(429).json({ error: 'Demasiados intentos para este pedido.', status: 'rejected', status_detail: 'cc_rejected_max_attempts' })
    }

    // Guardar el monto esperado ANTES de cobrar, así el webhook puede verificar
    await saveCheckout(firestore, storeId, orderId, {
      gateway: 'mercadopago',
      amount: pricing.total,
      currency: pricing.currency,
      payAmount: pricing.total,
      payCurrency: pricing.currency,
      couponId: pricing.coupon?.id || null,
    })

    // formData del Brick sin los campos que controla el servidor
    const cleanForm: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(formData)) {
      if (!BLOCKED_FORM_FIELDS.has(k)) cleanForm[k] = v
    }
    const paymentPayload = {
      ...cleanForm,
      transaction_amount: pricing.total,
      // Sin external_reference/notification_url el webhook no podía conciliar
      // los pagos del Brick con el pedido
      external_reference: orderId,
      notification_url: webhookUrlFor(storeId),
      description: `Pedido ${order.orderNumber || orderId}`.slice(0, 250),
      metadata: { store_id: storeId, order_id: orderId },
    }

    // Process the payment via MercadoPago Payments API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(paymentPayload)
    })

    const paymentResult = await mpResponse.json() as MpPayment & { message?: string; cause?: { code?: string }[] }

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

    let status = paymentResult.status
    if (paymentResult.status === 'approved') {
      const mismatch = mpPaymentMismatch(paymentResult, orderId,
        { payAmount: pricing.total, payCurrency: pricing.currency },
        typeof storeData?.currency === 'string' ? storeData.currency : undefined)
      if (mismatch) {
        // No debería pasar (el monto lo puso el servidor); queda para revisión manual
        console.error('[process-mp-payment] pago aprobado no coincide con el pedido:', { orderId, mismatch, paymentId: paymentResult.id })
        status = 'in_process'
        await payable.orderRef.update({ paymentId: String(paymentResult.id), updatedAt: new Date() })
      } else {
        // Transición pending|failed → paid; aplica stock y uso de cupón una vez
        await markOrderPaid(firestore, storeId, orderId, { paymentId: String(paymentResult.id), paymentMethod: 'mercadopago' })
      }
    } else if (paymentResult.status === 'in_process' || paymentResult.status === 'pending') {
      await payable.orderRef.update({
        paymentId: String(paymentResult.id),
        updatedAt: new Date()
      })
    }
    // rejected → keep order as pending, don't update paymentId

    return res.status(200).json({
      status,
      status_detail: paymentResult.status_detail,
      payment_id: paymentResult.id
    })
  } catch (error) {
    console.error('[process-mp-payment] Error:', error)
    return res.status(500).json({ error: 'Failed to process payment' })
  }
}

async function handleConfirmOrder(
  res: VercelResponse,
  storeId: string,
  orderId: string,
  paymentId?: string
) {
  if (!storeId || !orderId || !paymentId || !/^\d{1,30}$/.test(String(paymentId))) {
    return res.status(400).json({ error: 'Missing storeId, orderId, or paymentId' })
  }

  const firestore = getDb()

  const storeDoc = await firestore.collection('stores').doc(storeId).get()
  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const storeData = storeDoc.data() || {}
  const accessToken = (await getPaymentSecrets(firestore, storeId, storeData)).mercadopago?.accessToken

  if (!accessToken) {
    return res.status(400).json({ error: 'MercadoPago not configured' })
  }

  const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const orderDoc = await orderRef.get()

  if (!orderDoc.exists) {
    return res.status(404).json({ error: 'Order not found' })
  }
  const order = orderDoc.data() as OrderDoc

  // Verify payment with MercadoPago API (fuente de verdad, no el query string)
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (!mpResponse.ok) {
    console.error('[confirm-mp-order] Failed to verify payment:', mpResponse.status)
    return res.status(400).json({ error: 'Could not verify payment' })
  }

  const payment = await mpResponse.json() as MpPayment

  // El pago tiene que ser de ESTE pedido (evita usar un pago ajeno/barato)
  if (String(payment.external_reference || '') !== orderId) {
    console.warn('[confirm-mp-order] external_reference no coincide', { orderId, ref: payment.external_reference })
    return res.status(403).json({ error: 'Payment does not belong to this order' })
  }

  let orderStatus = order.status || 'pending'
  if (payment.status === 'approved') {
    const expected = await getExpectedPayment(firestore, storeId, orderId, storeData, order)
    const mismatch = mpPaymentMismatch(payment, orderId, expected,
      typeof storeData.currency === 'string' ? storeData.currency : undefined)
    if (mismatch) {
      console.error('[confirm-mp-order] pago no coincide con el pedido:', { orderId, mismatch, paymentId })
      await orderRef.update({ paymentId: String(paymentId), paymentReview: `mp:${mismatch}`, updatedAt: new Date() })
      return res.status(409).json({ status: 'review', orderStatus })
    }
    const r = await markOrderPaid(firestore, storeId, orderId, { paymentId: String(paymentId), paymentMethod: 'mercadopago' })
    if (r === 'paid' || r === 'already_paid') orderStatus = 'confirmed'
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    // Solo pending → failed; nunca pisa un pedido ya pagado
    await markOrderFailed(firestore, storeId, orderId, { paymentId: String(paymentId) })
  } else if (order.paymentStatus !== 'paid') {
    await orderRef.update({ paymentId: String(paymentId), updatedAt: new Date() })
  }

  console.log('[confirm-mp-order] Order updated:', { orderId, paymentStatus: payment.status })

  return res.status(200).json({
    status: payment.status,
    orderStatus
  })
}

/** Estado de pago de un pedido (sin datos personales). Requiere conocer storeId + orderId. */
async function handleOrderStatus(res: VercelResponse, storeId: string, orderId: string) {
  if (!storeId || !orderId) {
    return res.status(400).json({ error: 'Missing storeId or orderId' })
  }
  const snap = await getDb().collection('stores').doc(storeId).collection('orders').doc(orderId).get()
  if (!snap.exists) return res.status(404).json({ error: 'Order not found' })
  const order = snap.data() as OrderDoc
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    paymentStatus: order.paymentStatus || 'pending',
    status: order.status || 'pending',
  })
}
