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

interface PreferenceItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  currency_id: string
}

interface RequestBody {
  storeId: string
  orderId: string
  orderNumber: string
  items: PreferenceItem[]
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
    const { storeId, orderId, orderNumber, items, payer, external_reference, origin } = req.body as RequestBody

    if (!storeId || !orderId || !items?.length) {
      return res.status(400).json({ error: 'Missing required parameters: storeId, orderId, items' })
    }

    // Get store's MercadoPago credentials from Firestore (server-side only)
    const firestore = getDb()
    const storeDoc = await firestore.collection('stores').doc(storeId).get()

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }

    const storeData = storeDoc.data()
    const mpConfig = storeData?.payments?.mercadopago

    if (!mpConfig?.enabled) {
      return res.status(400).json({ error: 'MercadoPago is not enabled for this store' })
    }

    if (!mpConfig.accessToken) {
      return res.status(400).json({ error: 'MercadoPago access token not configured' })
    }

    // Determine environment
    const isSandbox = mpConfig.sandbox === true
    const baseOrigin = origin || 'https://shopifree.app'

    // Build webhook URL - use stable production URL (not VERCEL_URL which is deployment-specific)
    const webhookBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.APP_URL || baseOrigin
    const notificationUrl = `${webhookBase}/api/mp-webhook?storeId=${storeId}`

    // Encode order info in back_urls as fallback (localStorage may be lost on mobile redirects)
    const orderParams = `orderId=${encodeURIComponent(orderId)}&storeId=${encodeURIComponent(storeId)}&orderNumber=${encodeURIComponent(orderNumber || '')}`

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
      external_reference: external_reference || orderId,
      notification_url: notificationUrl,
      statement_descriptor: 'Shopifree',
      expires: false,
      binary_mode: false
    }

    // Call MercadoPago API server-side (no CORS issues)
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpConfig.accessToken}`,
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
