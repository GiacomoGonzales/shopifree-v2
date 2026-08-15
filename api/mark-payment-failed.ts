import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Marca el pago de un pedido como fallido cuando el comprador vuelve de la
 * pasarela sin pagar (canceló o falló el cobro).
 *
 * Existe porque el navegador del COMPRADOR es anónimo y las reglas de
 * Firestore solo dejan actualizar pedidos al dueño de la tienda: el updateDoc
 * que hacía PaymentFailure fallaba en silencio y el pedido quedaba 'pending'
 * para siempre. Y cuando alguien cancela en la pasarela sin intentar el pago,
 * MercadoPago normalmente no manda ningún webhook, así que nadie más lo iba a
 * corregir.
 *
 * Sin autenticación A PROPÓSITO, pero con la transición acotada: solo pasa
 * pedidos de pago online de 'pending' a 'failed'. Nunca toca un pedido pagado
 * ni permite inventar estados — lo peor que puede hacer un abusador es marcar
 * como fallido un pedido que todavía no se pagó, y el webhook real lo vuelve a
 * 'paid' si el cobro después se concreta.
 */

const ONLINE_METHODS = new Set(['mercadopago', 'stripe', 'gocuotas'])

function ensureFirebase() {
  if (getApps().length) return
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase env vars')
  }
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    ensureFirebase()
    const { storeId, orderId } = (req.body || {}) as { storeId?: string; orderId?: string }
    if (!storeId || !orderId) {
      return res.status(400).json({ error: 'Faltan storeId y orderId' })
    }

    const ref = getFirestore().collection('stores').doc(storeId).collection('orders').doc(orderId)
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'Pedido no encontrado' })

    const order = snap.data() || {}
    if (!ONLINE_METHODS.has(String(order.paymentMethod))) {
      return res.status(400).json({ error: 'El pedido no es de pago online' })
    }
    if (order.paymentStatus !== 'pending') {
      // Ya está paid/failed/refunded: no hay nada que marcar. Idempotente.
      return res.status(200).json({ ok: true, unchanged: true, paymentStatus: order.paymentStatus })
    }

    await ref.update({ paymentStatus: 'failed', updatedAt: new Date() })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[mark-payment-failed]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error' })
  }
}
