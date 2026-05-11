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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Webhooks are server-to-server, but allow OPTIONS for any pre-flight tooling.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // storeId comes via query string (we baked it into the webhook URL when creating the checkout)
    const storeId = (req.query.storeId as string) || ''
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>

    // Always log — we don't have a published spec, so capturing real payloads is essential during onboarding.
    console.log('[gocuotas-webhook] received:', { storeId, body })

    if (!storeId) {
      return res.status(400).json({ error: 'Missing storeId in query string' })
    }

    // Go Cuotas sends a flat payload like:
    // { order_reference_id, status, order_id, number_of_installments, amount_in_cents }
    // (alternate field names are accepted for safety)
    const orderId = pickField(body, ['order_reference_id', 'orderReferenceId', 'reference'])
    if (!orderId) {
      console.error('[gocuotas-webhook] no order_reference_id in payload:', body)
      return res.status(200).json({ received: true, warning: 'no order reference' })
    }

    const status = (pickField(body, ['status', 'state', 'payment_status', 'order_status']) || '').toLowerCase()
    const goCuotasOrderId = pickField(body, ['order_id', 'id', 'gocuotas_order_id'])
    const installments = pickField(body, ['number_of_installments', 'installments'])

    const firestore = getDb()
    const orderRef = firestore.collection('stores').doc(storeId).collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists) {
      console.error('[gocuotas-webhook] order not found:', { storeId, orderId })
      return res.status(200).json({ received: true, warning: 'order not found' })
    }

    const updateData: Record<string, unknown> = {
      paymentMethod: 'gocuotas',
      updatedAt: new Date()
    }
    if (goCuotasOrderId) updateData.paymentId = goCuotasOrderId
    if (installments) updateData.paymentNote = `Go Cuotas - ${installments} cuotas`

    // "approved" is the only success status confirmed by the Go Cuotas docs.
    // Other Rails-style verbs are accepted defensively.
    if (/^(approved|paid|delivered|succeeded|confirmed|completed)$/.test(status)) {
      updateData.paymentStatus = 'paid'
      updateData.status = 'confirmed'
      updateData.paidAt = new Date()
    } else if (/^(rejected|failed|cancell?ed|discarded|denied)$/.test(status)) {
      updateData.paymentStatus = 'failed'
    }

    await orderRef.update(updateData)
    console.log('[gocuotas-webhook] order updated:', { orderId, status, updateData })

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('[gocuotas-webhook] error:', error)
    // Acknowledge anyway — non-200 makes Go Cuotas retry indefinitely
    return res.status(200).json({ received: true, error: 'internal error logged' })
  }
}
