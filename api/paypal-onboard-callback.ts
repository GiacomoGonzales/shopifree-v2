import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { paypalFetch, type PayPalEnv } from './_lib/paypal-server'

/**
 * Step 2 of the "Connect with PayPal" flow. Called by the dashboard after
 * PayPal redirects the merchant back. The dashboard reads the query params
 * PayPal appended (merchantIdInPayPal, trackingId, permissionsGranted, ...)
 * and POSTs them here so we can:
 *
 *   1. Validate the trackingId matches the one we stored on store.payments.paypal
 *   2. Pull the canonical merchant status from PayPal (don't trust query params)
 *   3. Persist the merchant's PayPal merchantId + permissions on the store
 *
 * Body: {
 *   storeId, trackingId, merchantIdInPayPal,
 *   permissionsGranted?, consentStatus?, productIntentId?, accountStatus?,
 *   isEmailConfirmed?, sandbox?
 * }
 * Auth: Firebase ID token. Same owner check as paypal-onboard-link.
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

interface MerchantStatus {
  merchant_id: string
  primary_email_confirmed?: boolean
  payments_receivable?: boolean
  oauth_integrations?: {
    integration_type?: string
    integration_method?: string
    oauth_third_party?: { partner_client_id?: string; merchant_id?: string }[]
  }[]
  products?: { name: string; vetting_status?: string; capabilities?: string[] }[]
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Missing auth token' })

    const decoded = await getAuth().verifyIdToken(token)
    const uid = decoded.uid

    const {
      storeId,
      trackingId,
      merchantIdInPayPal,
      permissionsGranted,
      sandbox = true,
    } = req.body as {
      storeId?: string
      trackingId?: string
      merchantIdInPayPal?: string
      permissionsGranted?: string
      sandbox?: boolean
    }

    if (!storeId || !trackingId || !merchantIdInPayPal) {
      return res.status(400).json({ error: 'Missing storeId, trackingId or merchantIdInPayPal' })
    }

    const storeRef = db.collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const store = storeSnap.data() as {
      ownerId?: string
      payments?: { paypal?: { trackingId?: string } }
    }
    if (store.ownerId !== uid) {
      return res.status(403).json({ error: 'Not your store' })
    }

    // Validate the trackingId we stored when generating the link matches
    // what PayPal sent back. This prevents a malicious party from stuffing
    // someone else's merchantId into our store.
    const expectedTrackingId = store.payments?.paypal?.trackingId
    if (expectedTrackingId !== trackingId) {
      return res.status(400).json({
        error: `trackingId mismatch (expected="${expectedTrackingId}", got="${trackingId}")`,
      })
    }

    const env: PayPalEnv = sandbox ? 'sandbox' : 'live'

    // Fetch the canonical merchant status from PayPal — query params from
    // the redirect can be tampered with, the API call cannot (auth'd as
    // the partner). Endpoint:
    //   GET /v1/customer/partners/{partner_merchant_id}/merchant-integrations/{seller_merchant_id}
    const partnerMerchantId = sandbox
      ? process.env.PAYPAL_PARTNER_MERCHANT_ID_SANDBOX
      : process.env.PAYPAL_PARTNER_MERCHANT_ID_LIVE
    if (!partnerMerchantId) {
      return res.status(500).json({ error: 'Server misconfig: partner merchant id missing' })
    }

    const status = await paypalFetch<MerchantStatus>(
      env,
      `/v1/customer/partners/${partnerMerchantId}/merchant-integrations/${merchantIdInPayPal}`,
    )

    const grantedScopes = (permissionsGranted || '').split(',').map(s => s.trim()).filter(Boolean)
    const onboardingStatus: 'connected' | 'limited' | 'pending' =
      status.payments_receivable && status.primary_email_confirmed
        ? 'connected'
        : status.payments_receivable
          ? 'limited'
          : 'pending'

    await storeRef.set({
      payments: {
        paypal: {
          enabled: onboardingStatus === 'connected',
          sandbox,
          merchantId: merchantIdInPayPal,
          trackingId,
          onboardingStatus,
          paymentsReceivable: !!status.payments_receivable,
          primaryEmailConfirmed: !!status.primary_email_confirmed,
          permissionsGranted: grantedScopes,
          connectedAt: new Date(),
          lastCheckedAt: new Date(),
        },
      },
      updatedAt: new Date(),
    }, { merge: true })

    return res.status(200).json({
      ok: true,
      onboardingStatus,
      paymentsReceivable: !!status.payments_receivable,
      primaryEmailConfirmed: !!status.primary_email_confirmed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('paypal-onboard-callback error:', err)
    return res.status(500).json({ error: message })
  }
}
