import type { VercelRequest, VercelResponse } from '@vercel/node'
import { validateMerchantCredentials, type PayPalEnv } from '../src/lib/paypal-server.js'

/**
 * Quick credentials check the dashboard fires before saving. Hits the
 * OAuth token endpoint with the supplied clientId+secret; success means
 * the credentials are valid for the chosen environment, failure returns
 * the PayPal error so the merchant can fix the typo without committing
 * bad creds to Firestore.
 *
 * Body: { clientId, clientSecret, sandbox: boolean }
 * No auth required — credentials are user-supplied; we just bounce them
 * off PayPal. Stricter rate-limiting can come later if abuse appears.
 */

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
    const { clientId, clientSecret, sandbox = true } = req.body as {
      clientId?: string
      clientSecret?: string
      sandbox?: boolean
    }
    if (!clientId || !clientSecret) {
      return res.status(400).json({ ok: false, error: 'Missing clientId or clientSecret' })
    }
    const env: PayPalEnv = sandbox ? 'sandbox' : 'live'
    const error = await validateMerchantCredentials({ clientId, secret: clientSecret, env })
    if (error) return res.status(200).json({ ok: false, error })
    return res.status(200).json({ ok: true, env })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ ok: false, error: message })
  }
}
