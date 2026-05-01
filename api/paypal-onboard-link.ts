import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { paypalFetch, type PayPalEnv } from '../src/lib/paypal-server'

/**
 * Step 1 of the "Connect with PayPal" flow. Called by the merchant's
 * dashboard when they click the connect button. Returns a PayPal-hosted
 * onboarding URL — the merchant is redirected there, signs into PayPal
 * (or signs up), grants Shopifree the requested permissions, and PayPal
 * redirects back to /api/paypal-onboard-callback with a tracking_id.
 *
 * Body: { storeId: string, sandbox?: boolean, returnUrl?: string }
 * Auth: Firebase ID token. The caller must own the store (or be admin).
 *
 * Why a per-store trackingId: PayPal returns it in the callback so we can
 * tie the OAuth response to the right store doc. Stored on the store at
 * onboarding time, validated on callback.
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

interface PartnerReferralResponse {
  links: { href: string; rel: string; method: string }[]
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

    const { storeId, sandbox = true, returnUrl } = req.body as {
      storeId?: string
      sandbox?: boolean
      returnUrl?: string
    }
    if (!storeId) return res.status(400).json({ error: 'Missing storeId' })

    // Permission check: the caller must own the store
    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Store not found' })
    const store = storeSnap.data() as { ownerId?: string }
    if (store.ownerId !== uid) {
      return res.status(403).json({ error: 'Not your store' })
    }

    const env: PayPalEnv = sandbox ? 'sandbox' : 'live'
    const trackingId = `${storeId}-${Date.now()}`

    // The redirect target after the merchant finishes onboarding on PayPal.
    // PayPal appends ?merchantIdInPayPal=...&permissionsGranted=...&accountStatus=...&consentStatus=...&productIntentId=...
    const origin = req.headers.origin || returnUrl || 'https://shopifree.app'
    const finalReturnUrl = `${origin}/dashboard/payments?paypal_callback=1&tracking_id=${encodeURIComponent(trackingId)}`

    const referral = await paypalFetch<PartnerReferralResponse>(env, '/v2/customer/partner-referrals', {
      method: 'POST',
      body: {
        tracking_id: trackingId,
        partner_config_override: {
          return_url: finalReturnUrl,
          return_url_description: `Volver a Shopifree`,
        },
        operations: [
          {
            operation: 'API_INTEGRATION',
            api_integration_preference: {
              rest_api_integration: {
                integration_method: 'PAYPAL',
                integration_type: 'THIRD_PARTY',
                third_party_details: {
                  features: ['PAYMENT', 'REFUND'],
                },
              },
            },
          },
        ],
        products: ['EXPRESS_CHECKOUT'],
        legal_consents: [{ type: 'SHARE_DATA_CONSENT', granted: true }],
      },
    })

    const actionLink = referral.links.find(l => l.rel === 'action_url')
    if (!actionLink) {
      return res.status(502).json({ error: 'PayPal did not return an action_url' })
    }

    // Persist the trackingId on the store so we can validate the callback later.
    await db.collection('stores').doc(storeId).set({
      payments: {
        paypal: {
          enabled: false,
          sandbox,
          trackingId,
          onboardingStatus: 'pending',
        },
      },
      updatedAt: new Date(),
    }, { merge: true })

    return res.status(200).json({ url: actionLink.href, trackingId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('paypal-onboard-link error:', err)
    return res.status(500).json({ error: message })
  }
}
