import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore'
import { hasPaidEffectivePlan } from './_shared/plan.js'
import { priceOrder, amountsMatch, checkIpRateLimit, type OrderDoc } from './_shared/orderTotal.js'

/**
 * Link de pago de un pedido existente (ShopiChat → "Paga aquí").
 *
 * GET /api/pay-order?storeId=...&orderId=...  (público, sin sesión)
 *
 * Los pedidos NO son legibles por el comprador en Firestore, así que la página
 * pública /pay/{storeId}/{orderId} pide acá SOLO lo necesario para mostrar y
 * cobrar: número, líneas, totales, método y estado de pago. Nada del cliente
 * (teléfono, email, dirección) salvo el primer nombre para el saludo.
 *
 * Reglas:
 *  - El pedido tiene que tener `payLinkAt` (el comerciante generó el link desde
 *    ShopiChat). Un pedido cualquiera de la tienda no se expone por acá.
 *  - Los montos salen de priceOrder() (api/_shared/orderTotal.ts), recalculados
 *    desde los productos, el envío de la tienda y el cupón: nunca del cliente.
 *    Si no coinciden con el total guardado, `payable` es false (el cobro lo
 *    rechazaría igual: loadPayableOrder exige que coincidan).
 *  - El cobro en sí lo hacen los endpoints de siempre (create-mp-preference,
 *    stripe-payment, create-paypal-order, create-gocuotas-checkout), que
 *    vuelven a validar todo.
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

const ONLINE = new Set(['mercadopago', 'stripe', 'paypal', 'gocuotas'])
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : undefined)

function iso(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Timestamp) return v.toDate().toISOString()
  if (v instanceof Date) return v.toISOString()
  const d = new Date(v as string)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const storeId = String(req.query.storeId || '')
  const orderId = String(req.query.orderId || '')
  // Son ids de documento: con '/' apuntarían a otra ruta de Firestore.
  if (!ID_RE.test(storeId) || !ID_RE.test(orderId)) return res.status(400).json({ error: 'INVALID_PARAMS' })

  try {
    const firestore = getDb()
    if (!(await checkIpRateLimit(firestore, req, 'pay-order', 60))) {
      return res.status(429).json({ error: 'RATE_LIMITED' })
    }

    const [storeSnap, orderSnap] = await Promise.all([
      firestore.collection('stores').doc(storeId).get(),
      firestore.collection('stores').doc(storeId).collection('orders').doc(orderId).get(),
    ])
    // Mismo 404 si no existe o si no tiene link: no se confirma qué ids existen.
    if (!storeSnap.exists || !orderSnap.exists) return res.status(404).json({ error: 'NOT_FOUND' })
    const store = storeSnap.data() || {}
    const order = orderSnap.data() as OrderDoc & Record<string, unknown>
    if (!order.payLinkAt || order.isTest) return res.status(404).json({ error: 'NOT_FOUND' })

    const method = String(order.paymentMethod || '')
    const payments = (store.payments || {}) as Record<string, { enabled?: boolean; publishableKey?: string; publicKey?: string } | undefined>

    // Motivo por el que no se puede pagar online (null = se puede).
    let reason: string | null = null
    if (order.paymentStatus === 'paid') reason = 'already_paid'
    else if (order.paymentStatus === 'refunded') reason = 'refunded'
    else if (order.status === 'cancelled') reason = 'cancelled'
    else if (!ONLINE.has(method)) reason = 'offline_method'
    else if (!payments[method]?.enabled) reason = 'method_disabled'
    else if (!hasPaidEffectivePlan(store)) reason = 'method_disabled'

    // Montos recalculados en el servidor (sin exigir stock/usos: eso lo valida
    // el endpoint de cobro, que devuelve un error claro si hace falta).
    const priced = await priceOrder(firestore, storeId, store, order, { checkCouponUsage: false, checkStock: false })
    const pricing = priced.ok ? priced.pricing : null
    if (!priced.ok && !reason) reason = priced.code
    if (pricing && !reason && (typeof order.total !== 'number' || !amountsMatch(order.total, pricing.total, pricing.currency))) {
      reason = 'amount_mismatch'
    }
    // Sin recalcular (producto borrado, etc.): se muestra lo guardado, solo lectura.
    const items = (order.items || []).map((it, i) => ({
      name: str(pricing?.lines[i]?.name || it.productName, 200) || 'Item',
      quantity: Number(it.quantity) || 0,
      unitPrice: pricing ? pricing.lines[i]?.unitPrice ?? 0 : Number(it.price) || 0,
      variations: (it.selectedVariations || [])
        .filter(v => v && typeof v.value === 'string')
        .map(v => str(v.value, 80) as string),
    }))

    const firstName = (str(order.customer?.name, 80) || '').trim().split(/\s+/)[0] || null

    return res.status(200).json({
      store: {
        name: str(store.name, 120) || '',
        logo: str(store.logo, 500) || null,
        currency: pricing?.currency || String(store.currency || 'USD').toUpperCase(),
        language: str(store.language, 5) || 'es',
        subdomain: str(store.subdomain, 80) || null,
        customDomain: str(store.customDomain, 200) || null,
        whatsapp: str(store.whatsapp, 40) || null,
        // Llave PÚBLICA de Stripe (ya viaja al storefront): solo si el pedido se paga con Stripe.
        stripePublishableKey: method === 'stripe' ? str(payments.stripe?.publishableKey, 300) || null : null,
      },
      order: {
        orderNumber: str(order.orderNumber, 40) || '',
        firstName,
        items,
        subtotal: pricing ? pricing.subtotal : Number(order.subtotal) || 0,
        shipping: pricing ? pricing.shipping : Number(order.shippingCost) || 0,
        discount: pricing ? pricing.discount : Number(order.discount?.amount) || 0,
        couponCode: pricing?.coupon?.code || null,
        total: pricing ? pricing.total : Number(order.total) || 0,
        deliveryMethod: order.deliveryMethod === 'delivery' ? 'delivery' : 'pickup',
        paymentMethod: method,
        paymentStatus: String(order.paymentStatus || 'pending'),
        createdAt: iso(order.createdAt),
      },
      payable: reason === null,
      reason,
    })
  } catch (err) {
    console.error('[pay-order] error:', (err as Error).message)
    return res.status(500).json({ error: 'INTERNAL' })
  }
}
