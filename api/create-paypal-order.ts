import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { paypalFetch, isPayPalSupportedCurrency, getConversionRate, type MerchantCredentials } from '../src/lib/paypal-server.js'
import { hasPaidEffectivePlan, PLAN_REQUIRED_RESPONSE } from './_shared/plan.js'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import { loadPayableOrder, saveCheckout, checkIpRateLimit, bumpCheckoutAttempts, round2, amountsMatch, failBody } from './_shared/orderTotal.js'

/**
 * Creates a PayPal order using the merchant's own credentials. Called by the
 * storefront's checkout when the customer picks PayPal. Returns the approval
 * URL the customer is redirected to.
 *
 * Body: {
 *   storeId, orderId, orderNumber,
 *   origin: string
 * }
 * (items/total/currency del cliente se IGNORAN: el monto y los ítems salen
 * del pedido recalculado en el servidor — api/_shared/orderTotal.ts)
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
      origin,
    } = req.body as {
      storeId?: string
      orderId?: string
      orderNumber?: string | number
      origin?: string
    }

    if (!storeId || !orderId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })

    // Card payments are a paid feature — server-side gate (client is bypassable).
    if (!hasPaidEffectivePlan(storeSnap.data())) {
      return res.status(403).json(PLAN_REQUIRED_RESPONSE)
    }

    const store = storeSnap.data() as {
      name?: string
      currency?: string
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
    // Secreto server-only (doc privado, con fallback al campo legacy)
    const ppSecret = (await getPaymentSecrets(db, storeId, store)).paypal?.clientSecret
    if (!pp?.enabled || !pp?.clientId || !ppSecret) {
      return res.status(400).json({ error: 'Store does not have PayPal configured' })
    }

    // Anti-abuso: límite por IP y por pedido
    if (!(await checkIpRateLimit(db, req, 'paypal-order'))) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
    }

    // Monto calculado en el servidor (pedido existente, pendiente, total verificado)
    const payable = await loadPayableOrder(db, storeId, orderId, store as Record<string, unknown>, 'paypal')
    if (!payable.ok) {
      return res.status(payable.status).json(failBody(payable))
    }
    const { pricing } = payable
    const currency = pricing.currency

    if (!(await bumpCheckoutAttempts(db, storeId, orderId, 'attempts', 10))) {
      return res.status(429).json({ error: 'Demasiados intentos para este pedido.' })
    }

    const creds: MerchantCredentials = {
      clientId: pp.clientId,
      secret: ppSecret,
      env: pp.sandbox ? 'sandbox' : 'live',
    }
    const baseOrigin = origin || 'https://shopifree.app'

    // Encode order metadata in the return URL so the success page can confirm
    // the right Firestore order without a session cookie.
    const params = new URLSearchParams({
      paypal: '1',
      orderId,
      storeId,
      orderNumber: String(orderNumber ?? payable.order.orderNumber ?? ''),
    }).toString()

    // PayPal only accepts a fixed set of currencies for /v2/checkout/orders.
    // Most LatAm currencies (PEN, COP, ARS, CLP, etc.) aren't on the list, so
    // we transparently convert to USD using ECB rates from Frankfurter when
    // needed. The Firestore order keeps its original currency for our books.
    let payCurrency = currency
    let rate = 1
    if (!isPayPalSupportedCurrency(currency)) {
      try {
        rate = await getConversionRate(currency, 'USD')
        payCurrency = 'USD'
        console.log(`[paypal] converting ${currency}→USD at rate ${rate} (total ${pricing.total})`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        return res.status(502).json({ error: `Cannot convert ${currency} to USD for PayPal: ${msg}` })
      }
    }

    // PayPal valida que item_total = Σ(unit_amount × quantity) y que
    // amount = item_total + shipping − discount EXACTO. Antes el descuento del
    // cupón no iba en el breakdown y PayPal rechazaba los pedidos con cupón.
    // Cada componente se convierte y redondea por separado, y el total se arma
    // desde esos componentes ya redondeados para que siempre cuadre.
    // (JPY/HUF/TWD no admiten decimales en PayPal.)
    const noDecimals = ['JPY', 'HUF', 'TWD'].includes(payCurrency)
    const roundPay = (n: number) => noDecimals ? Math.round(n) : round2(n)
    const fmt = (n: number) => noDecimals ? String(Math.round(n)) : n.toFixed(2)
    const payLines = pricing.lines.map(l => ({ ...l, unit: roundPay(l.unitPrice * rate) }))
    const itemTotal = roundPay(payLines.reduce((sum, l) => sum + l.unit * l.quantity, 0))
    const shippingAmount = roundPay(pricing.shipping * rate)
    const discountAmount = Math.min(roundPay(pricing.discount * rate), itemTotal)
    const grandTotal = roundPay(itemTotal + shippingAmount - discountAmount)
    if (!(grandTotal > 0)) {
      return res.status(400).json({ error: 'Invalid order total' })
    }

    // Una orden PayPal por pedido: si ya existe con el mismo monto y sigue
    // abierta, se reutiliza su link de aprobación.
    const prev = payable.checkout
    if (prev?.paypalOrderId && typeof prev.payAmount === 'number' && prev.payCurrency === payCurrency
      && amountsMatch(prev.payAmount, grandTotal, payCurrency)) {
      try {
        const existing = await paypalFetch<PayPalOrder>(creds, `/v2/checkout/orders/${encodeURIComponent(prev.paypalOrderId)}`)
        const link = existing.links?.find(l => l.rel === 'approve' || l.rel === 'payer-action')
        if ((existing.status === 'CREATED' || existing.status === 'PAYER_ACTION_REQUIRED') && link) {
          return res.status(200).json({ paypalOrderId: existing.id, approveUrl: link.href })
        }
      } catch (err) {
        console.warn('[paypal] could not reuse previous PayPal order:', err instanceof Error ? err.message : err)
      }
    }

    const usePayItems = payLines.length <= 100
    const order = await paypalFetch<PayPalOrder>(creds, '/v2/checkout/orders', {
      method: 'POST',
      // Idempotencia por pedido + monto (si el monto cambia es otra orden)
      paypalRequestId: `${storeId}:${orderId}:${fmt(grandTotal)}${payCurrency}`,
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          custom_id: orderId,
          invoice_id: String(orderNumber ?? payable.order.orderNumber ?? orderId),
          amount: {
            currency_code: payCurrency,
            value: fmt(grandTotal),
            breakdown: {
              item_total: {
                currency_code: payCurrency,
                value: fmt(itemTotal),
              },
              ...(shippingAmount > 0 && {
                shipping: {
                  currency_code: payCurrency,
                  value: fmt(shippingAmount),
                },
              }),
              ...(discountAmount > 0 && {
                discount: {
                  currency_code: payCurrency,
                  value: fmt(discountAmount),
                },
              }),
            },
          },
          ...(usePayItems && {
            items: payLines.map(it => ({
              name: (it.name || 'Item').slice(0, 127),
              quantity: String(it.quantity),
              unit_amount: {
                currency_code: payCurrency,
                value: fmt(it.unit),
              },
            })),
          }),
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

    // Doc server-only: lo que esperamos que PayPal cobre, para verificar la
    // captura (process-paypal-payment) y el webhook.
    await saveCheckout(db, storeId, orderId, {
      gateway: 'paypal',
      amount: pricing.total,
      currency,
      payAmount: grandTotal,
      payCurrency,
      couponId: pricing.coupon?.id || null,
      paypalOrderId: order.id,
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
