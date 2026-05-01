import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { paypalFetch, type PayPalEnv } from '../src/lib/paypal-server'

/**
 * Creates a PayPal order on behalf of a connected merchant. Called by the
 * storefront's checkout when the customer picks PayPal as the payment
 * method. Returns a redirect URL to PayPal where the customer approves
 * the payment.
 *
 * Body: {
 *   storeId, orderId, orderNumber,
 *   items: [{ name, quantity, unit_price, currency }],
 *   total: number,
 *   currency: string,
 *   payer?: { email?, name? },
 *   origin: string
 * }
 *
 * No auth — this is the public storefront. The route only acts on stores
 * that have a connected PayPal merchant (validated against Firestore).
 */

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
const db = getFirestore()

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

interface PayPalOrder {
  id: string
  status: string
  links: { href: string; rel: string; method: string }[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      storeId,
      orderId,
      orderNumber,
      items,
      total,
      currency,
      origin,
    } = req.body as {
      storeId?: string
      orderId?: string
      orderNumber?: string | number
      items?: { name: string; quantity: number; unit_price: number; currency?: string }[]
      total?: number
      currency?: string
      origin?: string
    }

    if (!storeId || !orderId || !items || items.length === 0 || total === undefined || !currency) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const store = storeSnap.data() as {
      payments?: {
        paypal?: {
          enabled?: boolean
          sandbox?: boolean
          merchantId?: string
          paymentsReceivable?: boolean
        }
      }
    }
    const pp = store.payments?.paypal
    if (!pp?.enabled || !pp?.merchantId) {
      return res.status(400).json({ error: 'Store does not have PayPal connected' })
    }
    if (!pp.paymentsReceivable) {
      return res.status(400).json({ error: 'Connected merchant cannot yet receive payments — verify their PayPal account' })
    }

    const env: PayPalEnv = pp.sandbox ? 'sandbox' : 'live'
    const baseOrigin = origin || 'https://shopifree.app'

    // Encode order metadata in the return URL so the success page can
    // confirm the right Firestore order without a session cookie.
    const params = new URLSearchParams({
      paypal: '1',
      orderId,
      storeId,
      orderNumber: String(orderNumber ?? ''),
    }).toString()

    const order = await paypalFetch<PayPalOrder>(env, '/v2/checkout/orders', {
      method: 'POST',
      sellerMerchantId: pp.merchantId,
      paypalRequestId: `${storeId}:${orderId}`,
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          custom_id: orderId,
          invoice_id: String(orderNumber ?? orderId),
          amount: {
            currency_code: currency,
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: total.toFixed(2),
              },
            },
          },
          items: items.slice(0, 100).map(it => ({
            name: (it.name || 'Item').slice(0, 127),
            quantity: String(it.quantity),
            unit_amount: {
              currency_code: it.currency || currency,
              value: it.unit_price.toFixed(2),
            },
          })),
          payee: { merchant_id: pp.merchantId },
        }],
        application_context: {
          return_url: `${baseOrigin}/payment/success?${params}`,
          cancel_url: `${baseOrigin}/payment/failure?${params}`,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          brand_name: store.name as unknown as string || 'Shopifree',
        },
      },
    })

    const approveLink = order.links.find(l => l.rel === 'approve' || l.rel === 'payer-action')
    if (!approveLink) {
      return res.status(502).json({ error: 'PayPal did not return an approve link', orderResponse: order })
    }

    return res.status(200).json({
      paypalOrderId: order.id,
      approveUrl: approveLink.href,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('create-paypal-order error:', err)
    return res.status(500).json({ error: message })
  }
}
