import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { timingSafeEqual } from 'crypto'
import { getCheckout, amountsMatch, markOrderPaid, markOrderFailed, type OrderDoc } from './_shared/orderTotal.js'

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

// Pluck the first matching string field from a payload, optionally descending
// into common wrapper objects.
function pickField(payload: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of candidates) {
    const value = payload[key]
    if (typeof value === 'string' && value.length > 0) return value
    if (typeof value === 'number') return String(value)
  }
  for (const wrapper of ['data', 'order', 'payment', 'result']) {
    const inner = payload[wrapper]
    if (inner && typeof inner === 'object') {
      const found = pickField(inner as Record<string, unknown>, candidates)
      if (found) return found
    }
  }
  return null
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Seguridad: Go Cuotas no firma los webhooks ni documenta una API para
 * re-consultar el estado del checkout, así que el body no alcanza. La URL del
 * webhook la arma create-gocuotas-checkout con ?orderId=…&token=… donde el
 * token es secreto por pedido y vive en stores/{storeId}/payment_checkouts
 * (server-only). Sin token válido el evento se ignora. Además se compara
 * amount_in_cents con el monto que calculó el servidor.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Webhooks are server-to-server, but allow OPTIONS for any pre-flight tooling.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // storeId/orderId/token vienen en el query string (los pusimos en la URL del webhook al crear el checkout)
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : ''
    const queryOrderId = typeof req.query.orderId === 'string' ? req.query.orderId : ''
    const token = typeof req.query.token === 'string' ? req.query.token : ''
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>

    // Always log — we don't have a published spec, so capturing real payloads is essential during onboarding.
    console.log('[gocuotas-webhook] received:', { storeId, orderId: queryOrderId, body })

    if (!storeId) {
      return res.status(400).json({ error: 'Missing storeId in query string' })
    }

    // Go Cuotas sends a flat payload like:
    // { order_reference_id, status, order_id, number_of_installments, amount_in_cents }
    // (alternate field names are accepted for safety)
    const bodyOrderId = pickField(body, ['order_reference_id', 'orderReferenceId', 'reference'])
    const orderId = queryOrderId || bodyOrderId
    if (!orderId || orderId.includes('/')) {
      console.error('[gocuotas-webhook] no order_reference_id in payload:', body)
      return res.status(200).json({ received: true, warning: 'no order reference' })
    }
    if (bodyOrderId && bodyOrderId !== orderId) {
      console.warn('[gocuotas-webhook] order reference mismatch', { queryOrderId, bodyOrderId })
      return res.status(200).json({ received: true, warning: 'order mismatch' })
    }

    const firestore = getDb()

    // Token secreto por pedido (webhooks sin token = checkouts viejos o falsos → se ignoran)
    const checkout = await getCheckout(firestore, storeId, orderId)
    if (!checkout?.gocuotasToken || !token || !safeEqual(token, checkout.gocuotasToken)) {
      console.warn('[gocuotas-webhook] invalid or missing token — ignoring', { storeId, orderId })
      return res.status(200).json({ received: true, warning: 'unauthorized' })
    }

    const status = (pickField(body, ['status', 'state', 'payment_status', 'order_status']) || '').toLowerCase()
    const goCuotasOrderId = pickField(body, ['order_id', 'id', 'gocuotas_order_id'])
    const installments = pickField(body, ['number_of_installments', 'installments'])
    const amountInCents = pickField(body, ['amount_in_cents'])

    const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists) {
      console.error('[gocuotas-webhook] order not found:', { storeId, orderId })
      return res.status(200).json({ received: true, warning: 'order not found' })
    }
    const order = orderDoc.data() as OrderDoc

    // "approved" is the only success status confirmed by the Go Cuotas docs.
    // Other Rails-style verbs are accepted defensively.
    if (/^(approved|paid|delivered|succeeded|confirmed|completed)$/.test(status)) {
      // Monto: si Go Cuotas lo manda, tiene que coincidir con lo que calculó el servidor
      if (amountInCents && typeof checkout.amount === 'number'
        && !amountsMatch(Number(amountInCents) / 100, checkout.amount, checkout.currency || 'ARS')) {
        console.error('[gocuotas-webhook] amount mismatch', { orderId, amountInCents, expected: checkout.amount })
        if (order.paymentStatus !== 'paid') {
          await orderRef.update({ paymentReview: 'gocuotas:amount', updatedAt: new Date() })
        }
        return res.status(200).json({ received: true, warning: 'amount mismatch' })
      }
      // pending|failed → paid; stock y cupón una sola vez (idempotente con reintentos)
      const r = await markOrderPaid(firestore, storeId, orderId, {
        paymentMethod: 'gocuotas',
        ...(goCuotasOrderId && { paymentId: goCuotasOrderId }),
        ...(installments && { paymentNote: `Go Cuotas - ${installments} cuotas` }),
      })
      console.log('[gocuotas-webhook] order paid:', { orderId, status, result: r })
    } else if (/^(rejected|failed|cancell?ed|discarded|denied)$/.test(status)) {
      // Solo pending → failed; nunca pisa un pedido pagado
      const changed = await markOrderFailed(firestore, storeId, orderId, {
        paymentMethod: 'gocuotas',
        ...(goCuotasOrderId && { paymentId: goCuotasOrderId }),
      })
      console.log('[gocuotas-webhook] order failed:', { orderId, status, changed })
    } else {
      console.log('[gocuotas-webhook] status without change:', { orderId, status })
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('[gocuotas-webhook] error:', error)
    // Acknowledge anyway — non-200 makes Go Cuotas retry indefinitely
    return res.status(200).json({ received: true, error: 'internal error logged' })
  }
}
