/**
 * DELETE /api/v1/products/{externalId} — Remove an API-managed product.
 *
 * Safety: only deletes products where externalSource === 'api'. We will
 * NEVER delete a product the merchant created manually in the dashboard,
 * even if its doc ID happens to match the deterministic `api_${externalId}`
 * shape. Two checks defend this:
 *   1. Doc ID convention: API-created products are always `api_${id}`
 *   2. Field check: `externalSource` must equal 'api' on the stored doc
 *
 * Response:
 *   200 { deleted: true }
 *   404 { error: "Not found" }   — no doc or not API-owned
 *
 * Crypto utilities inline (Vercel function deploy gotcha — see /api/v1/store.ts).
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

async function verifyApiKey(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token.startsWith('sfk_')) return null
  const hash = createHash('sha256').update(token).digest('hex')
  const snap = await getDb()
    .collection('stores')
    .where('apiKey.hash', '==', hash)
    .limit(1)
    .get()
  if (snap.empty) return null
  const storeDoc = snap.docs[0]
  storeDoc.ref
    .update({ 'apiKey.lastUsedAt': FieldValue.serverTimestamp() })
    .catch(err => console.error('[v1/products/delete] lastUsedAt:', err))
  return storeDoc.id
}

function safeDocId(externalId: string): string {
  return `api_${externalId.replace(/[\/\.]/g, '_').slice(0, 250)}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const storeId = await verifyApiKey(req)
    if (!storeId) return res.status(401).json({ error: 'Invalid or missing API key' })

    const externalId = req.query.externalId
    if (!externalId || typeof externalId !== 'string') {
      return res.status(400).json({ error: 'externalId is required' })
    }

    const docId = safeDocId(externalId)
    const docRef = getDb().collection('stores').doc(storeId).collection('products').doc(docId)
    const snap = await docRef.get()

    if (!snap.exists) {
      return res.status(404).json({ error: 'Not found' })
    }

    // Defense in depth: refuse to delete unless the field marks it as API-owned.
    // Prevents accidental deletion of merchant-created products whose IDs
    // happen to collide with the deterministic `api_${id}` pattern.
    const data = snap.data()
    if (data?.externalSource !== 'api') {
      return res.status(404).json({ error: 'Not found' })
    }

    await docRef.delete()
    return res.status(200).json({ deleted: true })
  } catch (err) {
    const e = err as Error
    console.error('[v1/products/delete] error:', e)
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
}
