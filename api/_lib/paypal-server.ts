/**
 * Shared PayPal helpers for Vercel API routes. Lives in `api/` (rather than
 * `src/lib/`) so it's bundled with the serverless functions, but underscored
 * so Vercel doesn't expose it as its own endpoint.
 *
 * Supports two environments:
 *   sandbox  → https://api-m.sandbox.paypal.com  (Partner uses *_SANDBOX env vars)
 *   live     → https://api-m.paypal.com         (Partner uses *_LIVE env vars,
 *                                                added once Partner Program approves)
 *
 * The "Partner" credentials identify Shopifree to PayPal. The "merchant id" of
 * the seller is then passed in PayPal-Auth-Assertion headers when calling APIs
 * on behalf of that seller (e.g. creating an order on their PayPal account).
 */

export type PayPalEnv = 'sandbox' | 'live'

interface PartnerCredentials {
  clientId: string
  secret: string
  merchantId: string  // Shopifree's PayPal merchant id (the platform itself)
  baseUrl: string
}

export function getPartnerCredentials(env: PayPalEnv): PartnerCredentials {
  const isLive = env === 'live'
  const clientId = isLive
    ? process.env.PAYPAL_PARTNER_CLIENT_ID_LIVE
    : process.env.PAYPAL_PARTNER_CLIENT_ID_SANDBOX
  const secret = isLive
    ? process.env.PAYPAL_PARTNER_SECRET_LIVE
    : process.env.PAYPAL_PARTNER_SECRET_SANDBOX
  const merchantId = isLive
    ? process.env.PAYPAL_PARTNER_MERCHANT_ID_LIVE
    : process.env.PAYPAL_PARTNER_MERCHANT_ID_SANDBOX

  if (!clientId || !secret || !merchantId) {
    throw new Error(
      `Missing PayPal partner credentials for env=${env}. Set PAYPAL_PARTNER_{CLIENT_ID,SECRET,MERCHANT_ID}_${isLive ? 'LIVE' : 'SANDBOX'}.`
    )
  }

  return {
    clientId,
    secret,
    merchantId,
    baseUrl: isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
  }
}

interface CachedToken {
  accessToken: string
  expiresAt: number
}
const tokenCache: Partial<Record<PayPalEnv, CachedToken>> = {}

/**
 * Get an OAuth access token for the Partner. Cached in-memory per
 * environment with a 60-second buffer before the actual expiry to avoid
 * mid-request expirations under load. Each Vercel function instance has
 * its own cache; cold starts re-fetch a fresh token (acceptable — the
 * token endpoint is cheap and rate limits are generous).
 */
export async function getPartnerAccessToken(env: PayPalEnv): Promise<string> {
  const now = Date.now()
  const cached = tokenCache[env]
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.accessToken
  }

  const { clientId, secret, baseUrl } = getPartnerCredentials(env)
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal OAuth failed (${res.status}): ${text}`)
  }
  const json = await res.json() as { access_token: string; expires_in: number }
  tokenCache[env] = {
    accessToken: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  }
  return json.access_token
}

/**
 * Build the PayPal-Auth-Assertion header that authorizes Shopifree to make
 * an API call ON BEHALF OF a connected merchant. PayPal accepts this in lieu
 * of forwarding the merchant's own access token. Format: a JWT-like blob
 * (base64-encoded JSON, unsigned algorithm — PayPal docs explicitly accept
 * this for merchants who consented during onboarding).
 *
 * https://developer.paypal.com/api/rest/requests/#paypal-auth-assertion
 */
export function buildAuthAssertion(env: PayPalEnv, sellerMerchantId: string): string {
  const { clientId } = getPartnerCredentials(env)
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: clientId,
    payer_id: sellerMerchantId,
  })).toString('base64url')
  return `${header}.${payload}.`
}

/**
 * Wrapper around fetch() that authenticates as the Partner and (optionally)
 * acts on behalf of a specific merchant. Throws with the response body on
 * non-2xx so callers don't have to manually check res.ok.
 */
export async function paypalFetch<T = unknown>(
  env: PayPalEnv,
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    sellerMerchantId?: string  // when set, adds PayPal-Auth-Assertion
    paypalRequestId?: string   // optional idempotency key
  } = {},
): Promise<T> {
  const { baseUrl } = getPartnerCredentials(env)
  const accessToken = await getPartnerAccessToken(env)

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  if (init.sellerMerchantId) {
    headers['PayPal-Auth-Assertion'] = buildAuthAssertion(env, init.sellerMerchantId)
  }
  if (init.paypalRequestId) {
    headers['PayPal-Request-Id'] = init.paypalRequestId
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal ${init.method ?? 'GET'} ${path} failed (${res.status}): ${text}`)
  }
  // 204 No Content
  if (res.status === 204) return {} as T
  return await res.json() as T
}
