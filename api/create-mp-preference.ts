import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hasPaidEffectivePlan, PLAN_REQUIRED_RESPONSE } from './_shared/plan.js'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import { loadPayableOrder, saveCheckout, checkIpRateLimit, bumpCheckoutAttempts, amountsMatch, round2, failBody } from './_shared/orderTotal.js'
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
          privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

interface RequestBody {
  storeId: string
  orderId: string
  orderNumber: string
  // items/external_reference del cliente se IGNORAN: los ítems y el monto se
  // arman en el servidor desde el pedido recalculado (api/_shared/orderTotal.ts)
  items?: unknown[]
  payer?: {
    name?: string
    email?: string
    phone?: { number?: string }
  }
  external_reference?: string
  origin: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { storeId, orderId, orderNumber, payer, origin } = req.body as RequestBody

    if (!storeId || !orderId) {
      return res.status(400).json({ error: 'Missing required parameters: storeId, orderId' })
    }

    // Get store's MercadoPago credentials from Firestore (server-side only)
    const firestore = getDb()
    const storeDoc = await firestore.collection('stores').doc(storeId).get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()

    // Card payments are a paid feature. This is the REAL gate — the client UI
    // can be bypassed by editing payments.*.enabled directly in Firestore.
    if (!hasPaidEffectivePlan(storeData)) {
      return res.status(403).json(PLAN_REQUIRED_RESPONSE)
    }

    const mpConfig = storeData?.payments?.mercadopago

    if (!mpConfig?.enabled) {
      return res.status(400).json({ error: 'MercadoPago is not enabled for this store' })
    }

    // Secreto server-only (doc privado, con fallback al campo legacy)
    const mpAccessToken = (await getPaymentSecrets(firestore, storeId, storeData)).mercadopago?.accessToken
    if (!mpAccessToken) {
      return res.status(400).json({ error: 'MercadoPago access token not configured' })
    }

    // Anti-abuso: límite por IP y por pedido
    if (!(await checkIpRateLimit(firestore, req, 'mp-preference'))) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
    }

    // Monto calculado en el servidor: el pedido tiene que existir, estar
    // pendiente y su total coincidir con el recalculado desde los productos.
    const payable = await loadPayableOrder(firestore, storeId, orderId, storeData || {}, 'mercadopago')
    if (!payable.ok) {
      return res.status(payable.status).json(failBody(payable))
    }
    const { pricing, checkout } = payable

    // Determine environment
    const isSandbox = mpConfig.sandbox === true

    // Una preferencia por pedido: si ya se creó con el mismo monto, se reutiliza
    if (checkout?.mpPreferenceId && checkout.mpInitPoint && typeof checkout.amount === 'number'
      && amountsMatch(checkout.amount, pricing.total, pricing.currency)) {
      return res.status(200).json({
        init_point: isSandbox ? (checkout.mpSandboxInitPoint || checkout.mpInitPoint) : checkout.mpInitPoint,
        preference_id: checkout.mpPreferenceId,
        sandbox_init_point: checkout.mpSandboxInitPoint
      })
    }
    if (!(await bumpCheckoutAttempts(firestore, storeId, orderId, 'attempts', 10))) {
      return res.status(429).json({ error: 'Demasiados intentos para este pedido.' })
    }
    const baseOrigin = origin || 'https://shopifree.app'

    // Build webhook URL - use stable production URL (not VERCEL_URL which is deployment-specific)
    const webhookBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.APP_URL || baseOrigin
    const notificationUrl = `${webhookBase}/api/mp-webhook?storeId=${encodeURIComponent(storeId)}`

    // Encode order info in back_urls as fallback (localStorage may be lost on mobile redirects)
    const orderParams = `orderId=${encodeURIComponent(orderId)}&storeId=${encodeURIComponent(storeId)}&orderNumber=${encodeURIComponent(orderNumber || '')}`

    // Ítems armados en el servidor: productos a su precio real, envío como
    // línea aparte y descuento como línea negativa (mismo desglose que antes).
    // currency_id solo si la tienda tiene moneda configurada (si no, MP usa la
    // de la cuenta, como el comportamiento anterior sin moneda).
    const currencyId = typeof storeData?.currency === 'string' && storeData.currency ? storeData.currency : undefined
    const items: Array<{ id: string; title: string; quantity: number; unit_price: number; currency_id?: string }> =
      pricing.lines.map((l, index) => ({
        id: l.productId || `item-${index}`,
        title: l.name.slice(0, 250),
        quantity: l.quantity,
        unit_price: l.unitPrice,
        ...(currencyId && { currency_id: currencyId })
      }))
    if (pricing.shipping > 0) {
      items.push({ id: 'shipping', title: 'Envío', quantity: 1, unit_price: pricing.shipping, ...(currencyId && { currency_id: currencyId }) })
    }
    if (pricing.discount > 0) {
      const label = pricing.coupon?.code ? ` (${pricing.coupon.code})` : ''
      items.push({ id: 'discount', title: `Descuento${label}`, quantity: 1, unit_price: -round2(pricing.discount), ...(currencyId && { currency_id: currencyId }) })
    }

    // Create preference payload
    const payload = {
      items,
      payer: payer || undefined,
      back_urls: {
        success: `${baseOrigin}/payment/success?${orderParams}`,
        failure: `${baseOrigin}/payment/failure?${orderParams}`,
        pending: `${baseOrigin}/payment/pending?${orderParams}`
      },
      auto_return: 'approved',
      // Siempre el orderId: el webhook y la confirmación lo exigen
      external_reference: orderId,
      metadata: { store_id: storeId, order_id: orderId },
      notification_url: notificationUrl,
      statement_descriptor: 'Shopifree',
      expires: false,
      binary_mode: false
    }

    // Call MercadoPago API server-side (no CORS issues)
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json().catch(() => ({ message: 'Unknown error' }))
      console.error('[create-mp-preference] MercadoPago API error:', {
        status: mpResponse.status,
        error: errorData
      })
      return res.status(mpResponse.status).json({
        error: `MercadoPago error: ${errorData.message || mpResponse.statusText}`
      })
    }

    const result = await mpResponse.json()

    // Guardar en el doc server-only del cobro (monto esperado para verificar
    // la confirmación/webhook, y la preferencia para reutilizarla)
    await saveCheckout(firestore, storeId, orderId, {
      gateway: 'mercadopago',
      amount: pricing.total,
      currency: pricing.currency,
      payAmount: pricing.total,
      payCurrency: pricing.currency,
      couponId: pricing.coupon?.id || null,
      mpPreferenceId: result.id,
      mpInitPoint: result.init_point,
      mpSandboxInitPoint: result.sandbox_init_point,
    })

    // Return the init_point based on environment
    const init_point = isSandbox
      ? (result.sandbox_init_point || result.init_point)
      : result.init_point

    return res.status(200).json({
      init_point,
      preference_id: result.id,
      sandbox_init_point: result.sandbox_init_point
    })
  } catch (error) {
    console.error('[create-mp-preference] Error:', error)
    return res.status(500).json({ error: 'Failed to create MercadoPago preference' })
  }
}
