/**
 * POST /api/admin-rankings — Top stores rankings for the admin Dashboard.
 *
 * Admin-only. Returns top-5 stores per metric (lifetime):
 *   - topByViews:    page_view analytics count
 *   - topByOrders:   non-cancelled orders count
 *   - topByRevenue:  sum(order.total) of non-cancelled orders
 *   - topByWhatsApp: whatsapp_click analytics count
 *
 * Strategy: PER-STORE aggregation, not collectionGroup. We tried collectionGroup
 * scans first but they don't scale — with 300+ stores the function timed out
 * trying to download every analytics event across the platform. count() runs
 * server-side in Firestore and returns a single int, so each metric is cheap
 * regardless of how many events a store has.
 *
 * Concurrency is capped at 20 parallel store-fetches so we don't open hundreds
 * of sockets to Firestore at once.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

// Vercel function config — give us a 60s budget. Default is 10s on Hobby
// which is too short for 300+ stores. 60s is the cap on Hobby; Pro can go
// higher if we ever need it.
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

interface StoreMeta {
  id: string
  name: string
  subdomain: string
  logo?: string
  plan?: string
}

interface StoreMetrics {
  views: number
  whatsapp: number
  orders: number
  revenue: number
}

const TOP_N = 5
const CONCURRENCY = 20

/**
 * Worker pool: process items with at most `limit` running at once.
 * Returns results in same order as input.
 */
async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++
      try {
        results[idx] = await fn(items[idx])
      } catch (err) {
        // Don't let one store's failure tank the whole ranking. Log and
        // fill with empty metrics so the sort just buries it.
        console.error(`[admin-rankings] failed store at idx ${idx}:`, err)
        results[idx] = { views: 0, whatsapp: 0, orders: 0, revenue: 0 } as R
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function getStoreMetrics(storeId: string): Promise<StoreMetrics> {
  const firestore = getDb()
  const storeRef = firestore.collection('stores').doc(storeId)

  // 3 queries en paralelo por tienda:
  //   - count() de page_view (server-side, no descarga docs)
  //   - count() de whatsapp_click (idem)
  //   - get() de orders (necesitamos los docs para sumar revenue)
  const [viewsAgg, waAgg, ordersSnap] = await Promise.all([
    storeRef.collection('analytics').where('type', '==', 'page_view').count().get(),
    storeRef.collection('analytics').where('type', '==', 'whatsapp_click').count().get(),
    storeRef.collection('orders').get(),
  ])

  let orderCount = 0
  let revenue = 0
  ordersSnap.forEach(doc => {
    const data = doc.data()
    if (data.status === 'cancelled') return
    orderCount++
    revenue += Number(data.total) || 0
  })

  return {
    views: viewsAgg.data().count,
    whatsapp: waAgg.data().count,
    orders: orderCount,
    revenue,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const startedAt = Date.now()
  try {
    const firestore = getDb()

    // Step 1: get all stores
    const storesSnap = await firestore.collection('stores').get()
    const stores: StoreMeta[] = storesSnap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name || 'Sin nombre',
        subdomain: data.subdomain || '',
        logo: data.logo,
        plan: data.plan,
      }
    })
    console.log(`[admin-rankings] ${stores.length} stores fetched in ${Date.now() - startedAt}ms`)

    // Step 2: per-store metrics in parallel with concurrency cap
    const metricsStarted = Date.now()
    const allMetrics = await mapConcurrent(stores, CONCURRENCY, s => getStoreMetrics(s.id))
    console.log(`[admin-rankings] metrics for ${stores.length} stores in ${Date.now() - metricsStarted}ms`)

    // Step 3: build top-N rankings per metric
    const enriched = stores.map((s, i) => ({ ...s, ...allMetrics[i] }))

    const topByViews = enriched
      .filter(s => s.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, TOP_N)
      .map(({ id, name, subdomain, logo, plan, views }) => ({ id, name, subdomain, logo, plan, value: views }))

    const topByOrders = enriched
      .filter(s => s.orders > 0)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, TOP_N)
      .map(({ id, name, subdomain, logo, plan, orders }) => ({ id, name, subdomain, logo, plan, value: orders }))

    const topByRevenue = enriched
      .filter(s => s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, TOP_N)
      .map(({ id, name, subdomain, logo, plan, revenue }) => ({ id, name, subdomain, logo, plan, value: revenue }))

    const topByWhatsApp = enriched
      .filter(s => s.whatsapp > 0)
      .sort((a, b) => b.whatsapp - a.whatsapp)
      .slice(0, TOP_N)
      .map(({ id, name, subdomain, logo, plan, whatsapp }) => ({ id, name, subdomain, logo, plan, value: whatsapp }))

    console.log(`[admin-rankings] total time: ${Date.now() - startedAt}ms`)

    return res.status(200).json({
      topByViews,
      topByOrders,
      topByRevenue,
      topByWhatsApp,
    })
  } catch (error) {
    console.error('[admin-rankings] error after', Date.now() - startedAt, 'ms:', error)
    const err = error as Error
    return res.status(500).json({
      error: 'Internal server error',
      details: err.message,
      stack: err.stack,
    })
  }
}
