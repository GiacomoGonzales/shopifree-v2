/**
 * GET  /api/v1/orders?since=ISO&status=X&limit=N — List orders for polling
 * POST /api/v1/orders { action:"sync", orderId, externalInvoiceId } — Mark synced
 *
 * --- GET ---
 * The external system (Cobrify, etc.) polls this periodically to detect
 * new orders. Filters:
 *   - since:   ISO-8601 timestamp. Only orders with createdAt >= since.
 *              Caller should use the most recent createdAt from the previous
 *              response as the next `since` value.
 *   - status:  filter by order status (pending|confirmed|preparing|ready|
 *              delivered|cancelled). Optional.
 *   - limit:   max 500, default 100.
 *
 * Response:
 * {
 *   "orders": [
 *     {
 *       "id": "ord_abc",
 *       "orderNumber": "ORD-001",
 *       "createdAt": "2026-01-15T10:30:00Z",
 *       "status": "pending",
 *       "paymentStatus": "paid",
 *       "paymentMethod": "mercadopago",
 *       "customer": { "name": "...", "phone": "...", "email": "..." },
 *       "items": [
 *         {
 *           "productId": "api_cobrify-prod-123",
 *           "productExternalId": "cobrify-prod-123",   // stripped api_ prefix
 *           "productName": "...",
 *           "price": 50, "quantity": 2, "itemTotal": 100,
 *           "selectedVariations": [...], "selectedModifiers": [...]
 *         }
 *       ],
 *       "subtotal": 100, "shippingCost": 10, "discount": null, "total": 110,
 *       "deliveryMethod": "delivery", "deliveryAddress": {...},
 *       "notes": "...",
 *       "externalInvoice": { "id": "...", "syncedAt": "..." }  // if synced
 *     }
 *   ]
 * }
 *
 * --- POST (sync) ---
 * After the external system creates its invoice/sale, it calls this to
 * record the linkage. Body:
 *   { "action": "sync", "orderId": "ord_abc", "externalInvoiceId": "INV-001" }
 *
 * Response: { "synced": true }
 *
 * Single-file pattern (POST + GET in one handler) intentionally avoids
 * nested dynamic routes — Vercel routes `[id].ts` under a folder with
 * `index.ts` siblings fall through to the SPA fallback.
 */

import { createHash } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
    }
    db = getFirestore()
  }
  return db
}

async function verifyApiKey(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token.startsWith('sfk_')) return null
  const hash = createHash('sha256').update(token).digest('hex')
  const snap = await getDb()
    .collection('stores')
    .where('apiKey.hash', '==', hash)
    .limit(1)
    .get()
  if (snap.empty) return null
  const storeDoc = snap.docs[0]
  storeDoc.ref
    .update({ 'apiKey.lastUsedAt': FieldValue.serverTimestamp() })
    .catch(err => console.error('[v1/orders] lastUsedAt:', err))
  return storeDoc.id
}

// Firestore returns Timestamp; normalize to ISO string for JSON responses.
function toIso(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Timestamp) return v.toDate().toISOString()
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v
  return null
}

interface OrderItemRaw {
  productId?: string
  productName?: string
  productImage?: string
  price?: number
  quantity?: number
  selectedVariations?: Array<{ name: string; value: string }>
  selectedModifiers?: Array<{ groupName: string; options: Array<{ name: string; price: number }> }>
  itemTotal?: number
  combinationId?: string
  combinationSku?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const storeId = await verifyApiKey(req)
    if (!storeId) return res.status(401).json({ error: 'Invalid or missing API key' })

    const ordersRef = getDb().collection('stores').doc(storeId).collection('orders')

    // ─────────────────────── POST: sync action ───────────────────────
    if (req.method === 'POST') {
      const body = req.body || {}
      const action = body.action
      if (action !== 'sync') {
        return res.status(400).json({ error: 'Invalid action. Use "sync".' })
      }
      const orderId = typeof body.orderId === 'string' ? body.orderId : null
      const externalInvoiceId = typeof body.externalInvoiceId === 'string' ? body.externalInvoiceId : null
      if (!orderId) return res.status(400).json({ error: 'orderId is required' })
      if (!externalInvoiceId) return res.status(400).json({ error: 'externalInvoiceId is required' })

      const docRef = ordersRef.doc(orderId)
      const snap = await docRef.get()
      if (!snap.exists) return res.status(404).json({ error: 'Order not found' })

      await docRef.update({
        externalSource: 'api',
        externalInvoiceId,
        externalSyncedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      return res.status(200).json({ synced: true })
    }

    // ─────────────────────── GET: list orders ───────────────────────
    const since = typeof req.query.since === 'string' ? req.query.since : null
    const status = typeof req.query.status === 'string' ? req.query.status : null
    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 100
    const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 100), 500)

    let q: FirebaseFirestore.Query = ordersRef
    if (status) {
      q = q.where('status', '==', status)
    }
    if (since) {
      const sinceDate = new Date(since)
      if (Number.isNaN(sinceDate.getTime())) {
        return res.status(400).json({ error: 'Invalid "since" — must be ISO-8601' })
      }
      q = q.where('createdAt', '>=', sinceDate)
    }
    q = q.orderBy('createdAt', 'desc').limit(limit)

    const snap = await q.get()
    const orders = snap.docs.map(doc => {
      const data = doc.data()
      const items: OrderItemRaw[] = Array.isArray(data.items) ? data.items : []
      return {
        id: doc.id,
        orderNumber: data.orderNumber ?? null,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
        status: data.status ?? null,
        paymentStatus: data.paymentStatus ?? null,
        paymentMethod: data.paymentMethod ?? null,
        paidAt: toIso(data.paidAt),
        channel: data.channel ?? null,
        customer: data.customer ?? null,
        items: items.map(item => ({
          productId: item.productId ?? null,
          // Strip the `api_` prefix that products.ts adds to deterministic
          // doc IDs, so Cobrify gets back its own externalId for matching.
          productExternalId: typeof item.productId === 'string' && item.productId.startsWith('api_')
            ? item.productId.slice(4)
            : null,
          productName: item.productName ?? null,
          productImage: item.productImage ?? null,
          price: item.price ?? null,
          quantity: item.quantity ?? null,
          itemTotal: item.itemTotal ?? null,
          selectedVariations: item.selectedVariations ?? null,
          selectedModifiers: item.selectedModifiers ?? null,
          combinationId: item.combinationId ?? null,
          combinationSku: item.combinationSku ?? null,
        })),
        deliveryMethod: data.deliveryMethod ?? null,
        deliveryAddress: data.deliveryAddress ?? null,
        subtotal: data.subtotal ?? null,
        shippingCost: data.shippingCost ?? null,
        discount: data.discount ?? null,
        total: data.total ?? null,
        notes: data.notes ?? null,
        // Surface the API sync state so the caller can detect orders it
        // already processed (e.g. retries after a crash).
        externalInvoice: data.externalInvoiceId
          ? {
              id: data.externalInvoiceId,
              syncedAt: toIso(data.externalSyncedAt),
            }
          : null,
      }
    })

    return res.status(200).json({ orders, count: orders.length })
  } catch (err) {
    const e = err as Error
    console.error('[v1/orders] error:', e)
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
}
