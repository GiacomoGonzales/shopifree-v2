import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { paypalFetch, type MerchantCredentials } from '../src/lib/paypal-server.js'

/**
 * Creates a PayPal order using the merchant's own credentials. Called by the
 * storefront's checkout when the customer picks PayPal. Returns the approval
 * URL the customer is redirected to.
 *
 * Body: {
 *   storeId, orderId, orderNumber,
 *   items: [{ name, quantity, unit_price, currency }],
 *   total: number,
 *   currency: string,
 *   origin: string
 * }
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
      name?: string
      payments?: {
        paypal?: {
          enabled?: boolean
          sandbox?: boolean
          clientId?: string
          clientSecret?: string
        }
      }
    }
    const pp = store.payments?.paypal
    if (!pp?.enabled || !pp?.clientId || !pp?.clientSecret) {
      return res.status(400).json({ error: 'Store does not have PayPal configured' })
    }

    const creds: MerchantCredentials = {
      clientId: pp.clientId,
      secret: pp.clientSecret,
      env: pp.sandbox ? 'sandbox' : 'live',
    }
    const baseOrigin = origin || 'https://shopifree.app'

    // Encode order metadata in the return URL so the success page can confirm
    // the right Firestore order without a session cookie.
    const params = new URLSearchParams({
      paypal: '1',
      orderId,
      storeId,
      orderNumber: String(orderNumber ?? ''),
    }).toString()

    // PayPal validates that breakdown components sum exactly to amount.value
    // and item_total equals the sum of (unit_amount × quantity) for the items
    // array. The frontend sends `total` already inclusive of shipping, so we
    // have to back out shipping = total - itemSubtotal to keep the math
    // balanced. Round to 2 decimals to dodge JS float drift; any leftover
    // cent gets folded into shipping so the totals line up.
    const round2 = (n: number) => Math.round(n * 100) / 100
    const itemSubtotal = round2(items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0))
    const shippingAmount = round2(Math.max(0, total - itemSubtotal))

    const order = await paypalFetch<PayPalOrder>(creds, '/v2/checkout/orders', {
      method: 'POST',
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
                value: itemSubtotal.toFixed(2),
              },
              ...(shippingAmount > 0 && {
                shipping: {
                  currency_code: currency,
                  value: shippingAmount.toFixed(2),
                },
              }),
            },
          },
          items: items.slice(0, 100).map(it => ({
            name: (it.name || 'Item').slice(0, 127),
            quantity: String(it.quantity),
            unit_amount: {
              currency_code: currency,  // force store currency, ignore per-item override
              value: it.unit_price.toFixed(2),
            },
          })),
        }],
        application_context: {
          return_url: `${baseOrigin}/payment/success?${params}`,
          cancel_url: `${baseOrigin}/payment/failure?${params}`,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          brand_name: store.name || 'Shopifree',
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
