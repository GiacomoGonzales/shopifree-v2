/**
 * POST /api/admin-resync-stock — Audit and resync product.stock with
 * combinations[].stock across all stores (or a single store).
 *
 * Why this exists:
 *   Until the firebase.ts + useCheckout.ts fixes shipped, three different
 *   code paths could decrement stock — and one of them (decrementVariantStock)
 *   never updated product.stock. Combined with fire-and-forget writes in
 *   checkout, this drifted product.stock out of sync with the true source
 *   of truth (combinations[].stock). The public storefront uses product.stock
 *   for "agotado" badges, so the bug surfaced as:
 *     - "I set 1 unit → public shows AGOTADO"
 *     - "Stock was fine, hours later it's wrong"
 *
 *   This endpoint fixes the data that's already corrupted in production.
 *
 * Usage:
 *   POST /api/admin-resync-stock                    → dry run, all stores
 *   POST /api/admin-resync-stock?fix=true           → applies fix, all stores
 *   POST /api/admin-resync-stock?storeId=abc        → dry run, single store
 *   POST /api/admin-resync-stock?storeId=abc&fix=true → apply to one store
 *
 * Requires Authorization: Bearer <admin firebase id token>.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

export const config = {
  maxDuration: 60,
}

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

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

async function verifyAdmin(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  try {
    const token = authHeader.split('Bearer ')[1]
    getDb()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token)
    return ADMIN_EMAILS.includes(decoded.email || '')
  } catch {
    return false
  }
}

interface ProductCombination {
  id: string
  stock: number
  warehouseStock?: Record<string, number>
}

interface DriftRecord {
  storeId: string
  productId: string
  productName: string
  productStock: number | null
  combinationSum: number
  drift: number
  fixed: boolean
}

const CONCURRENCY = 10

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      try {
        results[idx] = await fn(items[idx])
      } catch (err) {
        console.error(`[admin-resync-stock] worker failed at idx ${idx}:`, err)
        results[idx] = [] as unknown as R
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function auditStore(storeId: string, applyFix: boolean): Promise<DriftRecord[]> {
  const firestore = getDb()
  const productsSnap = await firestore
    .collection('stores').doc(storeId)
    .collection('products')
    .get()

  const drifts: DriftRecord[] = []

  for (const doc of productsSnap.docs) {
    const data = doc.data() as {
      name?: string
      stock?: number
      combinations?: ProductCombination[]
      trackStock?: boolean
    }

    // Only audit products that actually track stock AND have combinations.
    // Products without combinations[] use product.stock directly, so they
    // can't be "out of sync".
    if (!data.trackStock) continue
    if (!data.combinations?.length) continue

    const combinationSum = data.combinations.reduce((s, c) => s + (c.stock || 0), 0)
    const currentProductStock = typeof data.stock === 'number' ? data.stock : null

    if (currentProductStock === combinationSum) continue

    const record: DriftRecord = {
      storeId,
      productId: doc.id,
      productName: data.name || '(unnamed)',
      productStock: currentProductStock,
      combinationSum,
      drift: (currentProductStock ?? 0) - combinationSum,
      fixed: false,
    }

    if (applyFix) {
      // Recompute warehouseStock as well so the dashboard inventory view
      // stays consistent with the combinations[].warehouseStock sources.
      const newWarehouseStock: Record<string, number> = {}
      for (const c of data.combinations) {
        if (c.warehouseStock) {
          for (const [wid, qty] of Object.entries(c.warehouseStock)) {
            newWarehouseStock[wid] = (newWarehouseStock[wid] || 0) + (qty || 0)
          }
        }
      }
      const patch: Record<string, unknown> = {
        stock: combinationSum,
        updatedAt: new Date(),
      }
      if (Object.keys(newWarehouseStock).length > 0) {
        patch.warehouseStock = newWarehouseStock
      }
      await doc.ref.update(patch)
      record.fixed = true
    }

    drifts.push(record)
  }

  return drifts
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const applyFix = req.query.fix === 'true' || req.query.fix === '1'
  const singleStoreId = typeof req.query.storeId === 'string' ? req.query.storeId : null

  try {
    const firestore = getDb()

    let storeIds: string[]
    if (singleStoreId) {
      storeIds = [singleStoreId]
    } else {
      const storesSnap = await firestore.collection('stores').get()
      storeIds = storesSnap.docs.map(d => d.id)
    }

    const perStoreDrifts = await mapConcurrent(storeIds, CONCURRENCY, sid => auditStore(sid, applyFix))
    const allDrifts = perStoreDrifts.flat()

    return res.status(200).json({
      mode: applyFix ? 'apply' : 'dryRun',
      scope: singleStoreId ? `store:${singleStoreId}` : 'all-stores',
      storesScanned: storeIds.length,
      driftedProducts: allDrifts.length,
      drifts: allDrifts,
    })
  } catch (err) {
    console.error('[admin-resync-stock] fatal:', err)
    return res.status(500).json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) })
  }
}
