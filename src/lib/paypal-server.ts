/// <reference types="node" />

/**
 * PayPal helpers — Standard Checkout (per-merchant credentials) flavor.
 *
 * Each merchant stores their own PayPal Business app's clientId + secret on
 * the store doc; these helpers authenticate with those credentials directly,
 * so PayPal sees us acting AS the merchant — no Partner Referrals, no
 * PayPal-Auth-Assertion. The trade-off vs the Partner Commerce Platform
 * flow is UX (merchants paste credentials instead of clicking "Connect"),
 * not capability — Standard Checkout supports the same Orders v2 + Capture
 * + Refund + Webhooks endpoints.
 *
 * This file is bundled into Vercel functions via vercel.json
 * `functions["api/**\/*.ts"].includeFiles = "src/lib/**"`. ESM imports must
 * include the `.js` extension at the call site (TypeScript resolves the .ts
 * source by stripping it).
 */

export type PayPalEnv = 'sandbox' | 'live'

export interface MerchantCredentials {
  clientId: string
  secret: string
  env: PayPalEnv
}

export function paypalBaseUrl(env: PayPalEnv): string {
  return env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

interface CachedToken {
  accessToken: string
  expiresAt: number
}
// Cache key = `${env}:${clientId}` so merchants don't share tokens. Tokens
// are scoped to an app, so cross-merchant pollution would break otherwise.
// Each Vercel function instance has its own cache; cold starts re-fetch.
const tokenCache = new Map<string, CachedToken>()

export async function getMerchantAccessToken(creds: MerchantCredentials): Promise<string> {
  const key = `${creds.env}:${creds.clientId}`
  const now = Date.now()
  const cached = tokenCache.get(key)
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.accessToken
  }

  const auth = Buffer.from(`${creds.clientId}:${creds.secret}`).toString('base64')
  const res = await fetch(`${paypalBaseUrl(creds.env)}/v1/oauth2/token`, {
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
  tokenCache.set(key, {
    accessToken: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  })
  return json.access_token
}

/**
 * Authenticated fetch against the PayPal REST API using a single merchant's
 * credentials. Throws with the response body on non-2xx so callers don't have
 * to manually check res.ok.
 */
export async function paypalFetch<T = unknown>(
  creds: MerchantCredentials,
  path: string,
  init: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    paypalRequestId?: string  // optional idempotency key
  } = {},
): Promise<T> {
  const accessToken = await getMerchantAccessToken(creds)
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  if (init.paypalRequestId) {
    headers['PayPal-Request-Id'] = init.paypalRequestId
  }

  const res = await fetch(`${paypalBaseUrl(creds.env)}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayPal ${init.method ?? 'GET'} ${path} failed (${res.status}): ${text}`)
  }
  if (res.status === 204) return {} as T
  return await res.json() as T
}

/**
 * Sanity-check a merchant's credentials by hitting the OAuth endpoint.
 * Returns null on success or a human-readable reason on failure.
 */
export async function validateMerchantCredentials(creds: MerchantCredentials): Promise<string | null> {
  try {
    await getMerchantAccessToken(creds)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'Unknown PayPal error'
  }
}
