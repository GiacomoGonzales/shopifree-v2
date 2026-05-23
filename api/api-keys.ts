/**
 * POST /api/api-keys — Generate or revoke the merchant's API key.
 *
 * Dashboard-facing endpoint (NOT /api/v1/* which is the public API). The
 * merchant calls this from their Settings page after authenticating with
 * their Firebase account.
 *
 * Body:
 *   { action: 'generate' }  → creates a new key (replaces any existing)
 *   { action: 'revoke' }    → deletes the key (next API calls 401)
 *
 * Auth: Authorization: Bearer <Firebase ID token>. The endpoint verifies the
 * token, looks up the merchant's storeId on their user doc, and operates
 * only on that store.
 *
 * Generate response (plain key shown ONLY here, never again):
 *   { plainKey: "sfk_...", prefix: "sfk_a1b2c3", createdAt: "..." }
 *
 * Crypto utilities live inline rather than in a shared file because Vercel
 * treats every .ts under api/ as its own function — even _shared/ folders.
 * Inlining matches the existing pattern (sync-subscription.ts) and avoids
 * FUNCTION_INVOCATION_FAILED on cold start.
 */

import { createHash, randomBytes } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'

let db: Firestore

function getDb(): Firestore {
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

const KEY_PREFIX = 'sfk_'
const KEY_ENTROPY_BYTES = 32 // 256 bits → 64 hex chars

function generateApiKey(): { plain: string; hash: string; prefix: string } {
  const random = randomBytes(KEY_ENTROPY_BYTES).toString('hex')
  const plain = `${KEY_PREFIX}${random}`
  const hash = createHash('sha256').update(plain).digest('hex')
  const prefix = plain.slice(0, 12)
  return { plain, hash, prefix }
}

async function verifyOwnerAndGetStoreId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.slice('Bearer '.length).trim()
    getDb()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token)
    const userSnap = await getDb().collection('users').doc(decoded.uid).get()
    if (!userSnap.exists) return null
    const storeId = userSnap.data()?.storeId
    return typeof storeId === 'string' ? storeId : null
  } catch (err) {
    console.error('[api-keys] auth error:', err)
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const storeId = await verifyOwnerAndGetStoreId(req)
    if (!storeId) return res.status(401).json({ error: 'Unauthorized' })

    const { action } = req.body || {}

    if (action === 'generate') {
      const { plain, hash, prefix } = generateApiKey()
      const createdAt = new Date()
      await getDb().collection('stores').doc(storeId).update({
        apiKey: {
          hash,
          prefix,
          createdAt,
          lastUsedAt: null,
        },
      })
      // The plain key is returned ONCE here. The dashboard must instruct the
      // merchant to copy it immediately — we don't store it and can't show
      // it again.
      return res.status(200).json({ plainKey: plain, prefix, createdAt: createdAt.toISOString() })
    }

    if (action === 'revoke') {
      await getDb().collection('stores').doc(storeId).update({
        apiKey: FieldValue.delete(),
      })
      return res.status(200).json({ revoked: true })
    }

    return res.status(400).json({ error: 'Invalid action. Use "generate" or "revoke".' })
  } catch (err) {
    const e = err as Error
    console.error('[api-keys] error:', e)
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
}
