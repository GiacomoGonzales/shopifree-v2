import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { checkIpRateLimit } from './_shared/orderTotal.js'
import { checkManualOrder, releaseOrderReservation, refundCouponUseIfCancelled } from './_shared/reservations.js'

/**
 * Reservas de stock / usos de cupón fuera del flujo de pasarela
 * (modelo completo en api/_shared/reservations.ts).
 *
 * POST /api/order-reservation
 *
 *  - { action: 'manual-order', storeId, orderId }  (público, sin sesión)
 *    Lo llama el checkout justo después de crear un pedido WhatsApp /
 *    transferencia. El comprador anónimo no puede escribir cupones (reglas),
 *    así que acá se cuenta el uso del cupón en una transacción respetando
 *    maxUses; si ya no quedan usos se cancela ese pedido recién creado y se
 *    responde 409 coupon_max_uses. También marca stockShortage si el
 *    disponible no alcanza (aviso no bloqueante para el comerciante).
 *    Acotado: solo pedidos del storefront pendientes de hace < 30 min, y el
 *    cupón se cuenta una sola vez (couponCounted).
 *
 *  - { action: 'release', storeId, orderId }  (dueño de la tienda, Bearer ID token)
 *    Lo llama el dashboard al cancelar un pedido: libera en el acto la reserva
 *    de un pago online pendiente y, si el pedido cancelado ya había contado el
 *    uso del cupón sin cobrarse, lo devuelve.
 */

let db: Firestore

function getDb(): Firestore {
  if (!db) {
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
    db = getFirestore()
  }
  return db
}

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

async function verifyUid(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    getDb()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(authHeader.slice('Bearer '.length).trim())
    return decoded.uid
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, storeId, orderId } = (req.body || {}) as { action?: string; storeId?: string; orderId?: string }
    if (!storeId || !orderId || !ID_RE.test(storeId) || !ID_RE.test(orderId)) {
      return res.status(400).json({ error: 'Faltan storeId y orderId' })
    }
    const firestore = getDb()

    if (action === 'manual-order') {
      if (!(await checkIpRateLimit(firestore, req, 'manual-order'))) {
        return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
      }
      const r = await checkManualOrder(firestore, storeId, orderId)
      if (!r.ok) return res.status(r.status).json({ error: r.error, code: r.code })
      return res.status(200).json({ ok: true, couponCounted: r.couponCounted, stockShortage: r.stockShortage.length > 0 })
    }

    if (action === 'release') {
      const uid = await verifyUid(req)
      if (!uid) return res.status(401).json({ error: 'Unauthorized' })
      const storeSnap = await firestore.collection('stores').doc(storeId).get()
      if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
      if ((storeSnap.data() || {}).ownerId !== uid) return res.status(403).json({ error: 'Forbidden' })

      const released = await releaseOrderReservation(firestore, storeId, orderId)
      const couponRefunded = await refundCouponUseIfCancelled(firestore, storeId, orderId)
      return res.status(200).json({ ok: true, released, couponRefunded })
    }

    return res.status(400).json({ error: 'Acción inválida' })
  } catch (err) {
    console.error('[order-reservation]', err)
    return res.status(500).json({ error: 'Error' })
  }
}
