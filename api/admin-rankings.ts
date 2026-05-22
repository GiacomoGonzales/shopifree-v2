/**
 * POST /api/admin-rankings — Top stores rankings for the admin Dashboard.
 *
 * Admin-only. Aggregates four lifetime metrics across all stores in one call:
 *   - topByViews:    page_view analytics events per store
 *   - topByOrders:   non-cancelled orders count per store
 *   - topByRevenue:  sum(order.total) of non-cancelled orders per store
 *   - topByWhatsApp: whatsapp_click analytics events per store
 *
 * Uses Firestore collectionGroup queries to scan all stores' subcollections
 * in 3 parallel reads (orders, page_view analytics, whatsapp_click analytics),
 * then aggregates in memory by storeId (extracted from doc.ref.parent.parent.id).
 *
 * Cost: one full scan per metric on every call. Fine for an admin tool that
 * loads at most a few times per session. If volume grows past ~500K analytics
 * docs, switch to time-windowed queries (last 90 days) + composite index on
 * (type, timestamp), or denormalize per-store counters updated by webhook.
 */

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

const TOP_N = 5

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!(await verifyAdmin(req))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const firestore = getDb()

    // 3 queries en paralelo (stores meta + 2 collectionGroup scans).
    // Nota: NO usamos .where('type', '==', X) en analytics porque collectionGroup
    // queries con where() requieren un indice explicito en firestore.indexes.json.
    // Hacer un scan completo y filtrar por type en codigo es mas barato que
    // mantener indices + es 1 round-trip menos que dos queries separadas.
    const [storesSnap, ordersSnap, analyticsSnap] = await Promise.all([
      firestore.collection('stores').get(),
      firestore.collectionGroup('orders').get(),
      firestore.collectionGroup('analytics').get(),
    ])

    // Tabla de metadata: storeId → datos basicos para renderizar
    const storeMeta: Record<string, StoreMeta> = {}
    storesSnap.forEach(doc => {
      const data = doc.data()
      storeMeta[doc.id] = {
        id: doc.id,
        name: data.name || 'Sin nombre',
        subdomain: data.subdomain || '',
        logo: data.logo,
        plan: data.plan,
      }
    })

    // Orders: ignoramos cancelados, sumamos count + revenue por store.
    // El storeId se extrae del path: stores/{storeId}/orders/{orderId}
    const orderStats: Record<string, { count: number; revenue: number }> = {}
    ordersSnap.forEach(doc => {
      const data = doc.data()
      if (data.status === 'cancelled') return
      const storeId = doc.ref.parent.parent?.id
      if (!storeId) return
      if (!orderStats[storeId]) orderStats[storeId] = { count: 0, revenue: 0 }
      orderStats[storeId].count++
      orderStats[storeId].revenue += Number(data.total) || 0
    })

    // Analytics: una sola pasada, despachamos por event type a su contador.
    const viewStats: Record<string, number> = {}
    const waStats: Record<string, number> = {}
    analyticsSnap.forEach(doc => {
      const storeId = doc.ref.parent.parent?.id
      if (!storeId) return
      const type = doc.data().type
      if (type === 'page_view') {
        viewStats[storeId] = (viewStats[storeId] || 0) + 1
      } else if (type === 'whatsapp_click') {
        waStats[storeId] = (waStats[storeId] || 0) + 1
      }
    })

    // Helper: convertir un stats object en un ranking ordenado top-N
    const buildRanking = <T extends Record<string, number | { count: number; revenue: number }>>(
      stats: T,
      valueFn: (v: T[string]) => number
    ) =>
      Object.entries(stats)
        .map(([storeId, v]) => ({
          ...storeMeta[storeId],
          value: valueFn(v as T[string]),
        }))
        .filter(s => s.id && s.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, TOP_N)

    return res.status(200).json({
      topByViews: buildRanking(viewStats, v => v as number),
      topByOrders: buildRanking(orderStats, v => (v as { count: number }).count),
      topByRevenue: buildRanking(orderStats, v => (v as { revenue: number }).revenue),
      topByWhatsApp: buildRanking(waStats, v => v as number),
    })
  } catch (error) {
    console.error('Error in admin-rankings:', error)
    const err = error as Error
    return res.status(500).json({ error: 'Internal server error', details: err.message })
  }
}
