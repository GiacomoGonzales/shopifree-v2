/**
 * GET /api/v1/store — return basic store info to validate an API key.
 *
 * First endpoint of the Shopifree public API. Integrations call this on
 * setup to confirm the key works and to display the connected store name
 * to the merchant. No state-mutating side effects.
 *
 * Auth: Authorization: Bearer sfk_<rest>. The key is hashed (SHA-256)
 * and matched against Store.apiKey.hash. Side effect: lastUsedAt is
 * updated asynchronously (no await) so the response isn't delayed.
 *
 * Response:
 * {
 *   "store": {
 *     "id": "abc123",
 *     "name": "Alien Store",
 *     "subdomain": "alienstore",
 *     "currency": "PEN",
 *     "language": "es",
 *     "plan": "pro"
 *   }
 * }
 *
 * Crypto utilities live inline rather than in a shared file because Vercel
 * treats every .ts under api/ as its own function — even _shared/ folders
 * cause FUNCTION_INVOCATION_FAILED on cold start. Matches the existing
 * convention (sync-subscription.ts).
 */

import { createHash } from 'crypto'
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

async function verifyApiKey(req: VercelRequest): Promise<{ storeId: string; data: FirebaseFirestore.DocumentData } | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token.startsWith(KEY_PREFIX)) return null

  const hash = createHash('sha256').update(token).digest('hex')
  const snap = await getDb()
    .collection('stores')
    .where('apiKey.hash', '==', hash)
    .limit(1)
    .get()

  if (snap.empty) return null

  const storeDoc = snap.docs[0]
  // Fire-and-forget: don't block response on the bookkeeping write.
  storeDoc.ref
    .update({ 'apiKey.lastUsedAt': FieldValue.serverTimestamp() })
    .catch(err => console.error('[v1/store] failed to update lastUsedAt:', err))

  return { storeId: storeDoc.id, data: storeDoc.data() }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const auth = await verifyApiKey(req)
    if (!auth) return res.status(401).json({ error: 'Invalid or missing API key' })

    return res.status(200).json({
      store: {
        id: auth.storeId,
        name: auth.data.name,
        subdomain: auth.data.subdomain,
        customDomain: auth.data.customDomain || null,
        currency: auth.data.currency,
        language: auth.data.language || 'es',
        plan: auth.data.plan,
        country: auth.data.location?.country || null,
      },
    })
  } catch (err) {
    const e = err as Error
    console.error('[v1/store] error:', e)
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
}
