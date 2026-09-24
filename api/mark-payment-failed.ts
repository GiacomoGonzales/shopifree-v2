import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import Stripe from 'stripe'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import { getCheckout, markOrderFailed } from './_shared/orderTotal.js'
import { paypalFetch } from '../src/lib/paypal-server.js'

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
 * 'paid' si el cobro después se concreta (failed → paid está permitido).
 *
 * Además, antes de marcarlo se consulta a la pasarela (MP/Stripe/PayPal) con
 * las credenciales del comerciante: si hay un pago aprobado o en proceso para
 * el pedido, NO se marca fallido. La transición es atómica (markOrderFailed):
 * solo pending → failed, nunca paid → failed.
 */

// PayPal incluido: al cancelar en PayPal el comprador vuelve a /payment/failure
// y antes el pedido quedaba 'pending' para siempre.
const ONLINE_METHODS = new Set(['mercadopago', 'stripe', 'gocuotas', 'paypal'])

/** true si la pasarela tiene un pago aprobado/en proceso para el pedido. */
async function gatewayHasLivePayment(
  db: Firestore,
  storeId: string,
  orderId: string,
  store: Record<string, unknown>,
  method: string,
): Promise<boolean> {
  const secrets = await getPaymentSecrets(db, storeId, store)
  const checkout = await getCheckout(db, storeId, orderId)
  try {
    if (method === 'mercadopago' && secrets.mercadopago?.accessToken) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&limit=20`, {
        headers: { 'Authorization': `Bearer ${secrets.mercadopago.accessToken}` }
      })
      if (!r.ok) return false
      const json = await r.json() as { results?: { status?: string }[] }
      return (json.results || []).some(p => ['approved', 'authorized', 'in_process', 'pending', 'in_mediation'].includes(String(p.status)))
    }
    if (method === 'stripe' && secrets.stripe?.secretKey && checkout?.stripePaymentIntentId) {
      const pi = await new Stripe(secrets.stripe.secretKey).paymentIntents.retrieve(checkout.stripePaymentIntentId)
      return pi.status === 'succeeded' || pi.status === 'processing' || pi.status === 'requires_capture'
    }
    if (method === 'paypal' && secrets.paypal?.clientSecret && checkout?.paypalOrderId) {
      const pp = (store.payments as { paypal?: { clientId?: string; sandbox?: boolean } } | undefined)?.paypal
      if (!pp?.clientId) return false
      const order = await paypalFetch<{ status?: string }>(
        { clientId: pp.clientId, secret: secrets.paypal.clientSecret, env: pp.sandbox ? 'sandbox' : 'live' },
        `/v2/checkout/orders/${encodeURIComponent(checkout.paypalOrderId)}`,
      )
      return order.status === 'APPROVED' || order.status === 'COMPLETED'
    }
  } catch (err) {
    console.warn('[mark-payment-failed] gateway check failed:', err instanceof Error ? err.message : err)
  }
  return false
}

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

    const db = getFirestore()
    const ref = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
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

    // No fallar un pedido cuyo pago sí se aprobó (o sigue en proceso) en la pasarela
    const storeSnap = await db.collection('stores').doc(storeId).get()
    const store = (storeSnap.data() || {}) as Record<string, unknown>
    if (await gatewayHasLivePayment(db, storeId, orderId, store, String(order.paymentMethod))) {
      return res.status(200).json({ ok: true, unchanged: true, paymentStatus: 'pending' })
    }

    // Transacción: solo pending → failed (si un webhook lo pagó recién, no se toca)
    const changed = await markOrderFailed(db, storeId, orderId)
    return res.status(200).json({ ok: true, ...(changed ? {} : { unchanged: true }) })
  } catch (err) {
    console.error('[mark-payment-failed]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error' })
  }
}
