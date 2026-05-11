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
  amount: number              // total in store currency (e.g. ARS), as a regular number — we convert to cents
  customerEmail?: string
  customerPhone?: string
  origin: string              // window.location.origin from the buyer's browser, used to build return URLs
}

// Pull a token out of the auth response body. Many Rails-style APIs (which Go
// Cuotas appears to be) return the token in headers instead — handled separately.
function extractTokenFromBody(payload: Record<string, unknown>): string | null {
  const candidates = ['token', 'access_token', 'jwt', 'auth_token', 'authentication_token']
  for (const key of candidates) {
    const value = payload[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  for (const wrapper of ['data', 'result']) {
    const inner = payload[wrapper]
    if (inner && typeof inner === 'object') {
      const found = extractTokenFromBody(inner as Record<string, unknown>)
      if (found) return found
    }
  }
  return null
}

function extractTokenFromHeaders(headers: Headers): string | null {
  // Devise/JWT-style APIs commonly expose the token in Authorization header
  const auth = headers.get('authorization')
  if (auth) return auth.replace(/^Bearer\s+/i, '').trim()
  for (const key of ['access-token', 'x-auth-token', 'authentication-token', 'token']) {
    const value = headers.get(key)
    if (value) return value.trim()
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { storeId, orderId, orderNumber, amount, customerEmail, customerPhone, origin } = req.body as RequestBody

    if (!storeId || !orderId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Missing required parameters: storeId, orderId, amount' })
    }

    const firestore = getDb()
    const storeDoc = await firestore.collection('stores').doc(storeId).get()
    if (!storeDoc.exists) return res.status(404).json({ error: 'Store not found' })

    const storeData = storeDoc.data()
    const gcConfig = storeData?.payments?.gocuotas

    if (!gcConfig?.enabled) return res.status(400).json({ error: 'Go Cuotas is not enabled for this store' })
    if (!gcConfig.email || !gcConfig.password) {
      return res.status(400).json({ error: 'Go Cuotas credentials not configured' })
    }

    const apiBase = gcConfig.sandbox === true
      ? 'https://sandbox.gocuotas.com/api_redirect/v1'
      : 'https://www.gocuotas.com/api_redirect/v1'

    // Step 1 — authenticate to obtain a token. Per Go Cuotas' docs the
    // credentials go as query string params (not a JSON body).
    const authUrl = `${apiBase}/authentication?email=${encodeURIComponent(gcConfig.email)}&password=${encodeURIComponent(gcConfig.password)}`
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text().catch(() => '')
      console.error('[create-gocuotas-checkout] auth error:', authResponse.status, errorText)
      return res.status(authResponse.status).json({
        error: 'Go Cuotas authentication failed. Verifica el email y la contrasena en el dashboard.'
      })
    }

    // Token may come in headers (Rails/Devise/JWT style) or in the JSON body.
    const headerToken = extractTokenFromHeaders(authResponse.headers)
    const authPayload = await authResponse.json().catch(() => ({} as Record<string, unknown>))
    const token = headerToken || extractTokenFromBody(authPayload)
    if (!token) {
      console.error('[create-gocuotas-checkout] no token in auth response:', {
        headers: Object.fromEntries(authResponse.headers.entries()),
        body: authPayload
      })
      return res.status(502).json({ error: 'Go Cuotas did not return an auth token' })
    }

    // Step 2 — create the checkout resource
    const baseOrigin = origin || 'https://shopifree.app'
    const orderParams = `orderId=${encodeURIComponent(orderId)}&storeId=${encodeURIComponent(storeId)}&orderNumber=${encodeURIComponent(orderNumber || '')}`

    const webhookBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.APP_URL || baseOrigin
    const webhookUrl = `${webhookBase}/api/gocuotas-webhook?storeId=${encodeURIComponent(storeId)}`

    // amount_in_cents: Go Cuotas wants the total expressed in cents (centavos).
    // 1500.50 ARS → 150050.
    const amountInCents = Math.round(amount * 100)

    const checkoutPayload: Record<string, unknown> = {
      amount_in_cents: amountInCents,
      url_success: `${baseOrigin}/payment/success?${orderParams}&gocuotas=1`,
      url_failure: `${baseOrigin}/payment/failure?${orderParams}&gocuotas=1`,
      order_reference_id: orderId,
      webhook_url: webhookUrl,
    }
    if (customerEmail) checkoutPayload.email = customerEmail
    if (customerPhone) checkoutPayload.phone_number = customerPhone.replace(/\D/g, '')

    const checkoutResponse = await fetch(`${apiBase}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(checkoutPayload)
    })

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text().catch(() => '')
      console.error('[create-gocuotas-checkout] checkout error:', checkoutResponse.status, errorText)
      return res.status(checkoutResponse.status).json({
        error: `Go Cuotas error: ${errorText || checkoutResponse.statusText}`
      })
    }

    const checkoutResult = await checkoutResponse.json().catch(() => ({} as Record<string, unknown>))
    const urlInit = (checkoutResult.url_init || (checkoutResult.data as Record<string, unknown> | undefined)?.url_init) as string | undefined

    if (!urlInit || typeof urlInit !== 'string') {
      console.error('[create-gocuotas-checkout] no url_init in response:', checkoutResult)
      return res.status(502).json({ error: 'Go Cuotas did not return a redirect URL' })
    }

    return res.status(200).json({
      url_init: urlInit,
      checkout_id: checkoutResult.id || null
    })
  } catch (error) {
    console.error('[create-gocuotas-checkout] error:', error)
    return res.status(500).json({ error: 'Failed to create Go Cuotas checkout' })
  }
}
