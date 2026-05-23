/**
 * Shared utilities for the public Shopifree API v1.
 *
 * Underscore-prefixed folder so Vercel does NOT deploy these as serverless
 * functions — they're imported by the real /api/v1/* endpoints.
 *
 * Responsibilities:
 *  - Initialize Firebase Admin once per cold start
 *  - Generate API keys (sfk_ + 64 hex chars)
 *  - Hash + verify keys (SHA-256, fast since input is high-entropy)
 *  - Authenticate incoming requests via Authorization: Bearer <key>
 *  - Update lastUsedAt asynchronously without blocking the response
 */

import { createHash, randomBytes } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'

let db: Firestore

export function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
    }
    db = getFirestore()
  }
  return db
}

// =====================================================
// Key generation + hashing
// =====================================================

const KEY_PREFIX = 'sfk_'
const KEY_ENTROPY_BYTES = 32 // 256 bits → 64 hex chars

export function generateApiKey(): { plain: string; hash: string; prefix: string } {
  const random = randomBytes(KEY_ENTROPY_BYTES).toString('hex')
  const plain = `${KEY_PREFIX}${random}`
  const hash = hashApiKey(plain)
  // Prefix shown in UI for identification (e.g. "sfk_a1b2c3..."). Long
  // enough to be useful for distinguishing keys, short enough to not leak
  // meaningful entropy.
  const prefix = plain.slice(0, 12)
  return { plain, hash, prefix }
}

export function hashApiKey(plain: string): string {
  // SHA-256 is the right choice for high-entropy random tokens — fast lookup,
  // brute-force impossible (2^256 search space). bcrypt/argon2 would slow
  // every API call by 100ms+ for no security gain over a 256-bit random key.
  return createHash('sha256').update(plain).digest('hex')
}

// =====================================================
// Request authentication
// =====================================================

export interface AuthedRequest {
  storeId: string
  store: FirebaseFirestore.DocumentSnapshot
}

/**
 * Verify the Authorization: Bearer <key> header against stored hashes.
 * Returns null if missing/invalid; the caller is responsible for sending 401.
 *
 * Side effect: updates apiKey.lastUsedAt asynchronously. We don't await it
 * so the response isn't slowed down by an extra write.
 */
export async function verifyApiKey(req: VercelRequest): Promise<AuthedRequest | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token.startsWith(KEY_PREFIX)) return null

  const hash = hashApiKey(token)
  const firestore = getDb()

  const snap = await firestore
    .collection('stores')
    .where('apiKey.hash', '==', hash)
    .limit(1)
    .get()

  if (snap.empty) return null

  const storeDoc = snap.docs[0]
  // Fire-and-forget: don't block the response on the bookkeeping write.
  storeDoc.ref
    .update({ 'apiKey.lastUsedAt': FieldValue.serverTimestamp() })
    .catch(err => console.error('[api-auth] failed to update lastUsedAt:', err))

  return { storeId: storeDoc.id, store: storeDoc }
}

/**
 * Convenience wrapper: handles common boilerplate (OPTIONS, method whitelist,
 * auth check, error responses). The handler receives an authed request.
 */
export function withApiKey(
  allowedMethods: string[],
  handler: (req: VercelRequest, res: VercelResponse, auth: AuthedRequest) => Promise<unknown>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', [...allowedMethods, 'OPTIONS'].join(', '))
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (!req.method || !allowedMethods.includes(req.method)) {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const auth = await verifyApiKey(req)
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or missing API key' })
      }
      await handler(req, res, auth)
    } catch (err) {
      const e = err as Error
      console.error(`[api-v1] ${req.method} ${req.url}:`, e)
      return res.status(500).json({ error: 'Internal server error', details: e.message })
    }
  }
}
