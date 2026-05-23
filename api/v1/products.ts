/**
 * POST /api/v1/products — Bulk upsert products from an external system.
 *
 * Body:
 * {
 *   "products": [
 *     {
 *       "externalId": "cobrify-prod-123",   // required, source system's ID
 *       "name": "Camiseta Roja",             // required
 *       "price": 50,                          // required
 *       "sku": "SHIRT-RED-M",                 // optional
 *       "description": "...",
 *       "shortDescription": "...",
 *       "stock": 10,
 *       "trackStock": true,
 *       "comparePrice": 70,                   // crossed-out "before" price
 *       "images": ["https://...", "..."],     // first becomes main image
 *       "categoryName": "Camisas",            // find-or-create in this store
 *       "brand": "Acme",
 *       "tags": ["verano", "cotton"],
 *       "active": true
 *     }
 *   ]
 * }
 *
 * Response:
 *   { "created": 5, "updated": 3, "errors": [{ externalId, error }] }
 *
 * Strategy: deterministic doc ID `api_${externalId}` so upserts are direct
 * .get()/.set() by primary key — no query, no index needed. The price of
 * deterministic IDs is they expose externalId in the doc path, but doc IDs
 * are not user-facing in Shopifree (slugs are).
 *
 * Categories are find-or-create by exact-name match within this store. If
 * two batched products reference the same category name, both end up with
 * the same categoryId (we batch the lookups).
 *
 * Crypto utilities are inline (Vercel treats every .ts under api/ as a
 * function — shared folders break cold start). Matches existing pattern.
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
    .catch(err => console.error('[v1/products] lastUsedAt update failed:', err))
  return storeDoc.id
}

// Latin-1 → ASCII slug. Strips accents, lowercases, replaces non-alphanum
// runs with single hyphens, trims edge hyphens. Falls back to the externalId
// if name slugs to empty (e.g. emoji-only names).
function slugify(input: string, fallback: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || fallback.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}

// Firestore doc IDs can't contain `/` or start with `.` — sanitize before use.
function safeDocId(externalId: string): string {
  return `api_${externalId.replace(/[\/\.]/g, '_').slice(0, 250)}`
}

interface IncomingProduct {
  externalId?: string
  name?: string
  price?: number
  sku?: string
  description?: string
  shortDescription?: string
  stock?: number
  trackStock?: boolean
  comparePrice?: number
  images?: string[]
  categoryName?: string
  brand?: string
  tags?: string[]
  active?: boolean
}

/**
 * Find existing categories by name (one batch read) and create any missing
 * ones in a single transaction. Returns a map of name → categoryId.
 */
async function resolveCategories(
  storeId: string,
  names: string[]
): Promise<Record<string, string>> {
  const firestore = getDb()
  const unique = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)))
  if (unique.length === 0) return {}

  const categoriesRef = firestore.collection('stores').doc(storeId).collection('categories')

  // Firestore `in` supports up to 30 values per query — chunk if needed.
  const result: Record<string, string> = {}
  const toCreate: string[] = []
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30)
    const snap = await categoriesRef.where('name', 'in', chunk).get()
    const found = new Set<string>()
    snap.forEach(doc => {
      const data = doc.data()
      if (typeof data.name === 'string' && chunk.includes(data.name)) {
        result[data.name] = doc.id
        found.add(data.name)
      }
    })
    chunk.forEach(name => {
      if (!found.has(name)) toCreate.push(name)
    })
  }

  // Create missing categories. Doc IDs random, slug derived from name.
  for (const name of toCreate) {
    const docRef = categoriesRef.doc()
    await docRef.set({
      storeId,
      name,
      slug: slugify(name, docRef.id),
      order: 100,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    result[name] = docRef.id
  }

  return result
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const storeId = await verifyApiKey(req)
    if (!storeId) return res.status(401).json({ error: 'Invalid or missing API key' })

    const body = req.body || {}
    const incoming: IncomingProduct[] = Array.isArray(body.products) ? body.products : []
    if (incoming.length === 0) {
      return res.status(400).json({ error: 'Body must include a non-empty "products" array' })
    }
    if (incoming.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 products per request' })
    }

    // 1. Resolve all unique category names → categoryIds (batch)
    const categoryNames = incoming.map(p => p.categoryName).filter((n): n is string => !!n)
    const categoryMap = await resolveCategories(storeId, categoryNames)

    // 2. Upsert each product
    const firestore = getDb()
    const productsRef = firestore.collection('stores').doc(storeId).collection('products')

    let created = 0
    let updated = 0
    const errors: Array<{ externalId?: string; error: string }> = []

    for (const p of incoming) {
      try {
        if (!p.externalId || typeof p.externalId !== 'string') {
          errors.push({ externalId: p.externalId, error: 'externalId is required (string)' })
          continue
        }
        if (!p.name || typeof p.name !== 'string') {
          errors.push({ externalId: p.externalId, error: 'name is required (string)' })
          continue
        }
        if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0) {
          errors.push({ externalId: p.externalId, error: 'price is required (non-negative number)' })
          continue
        }

        const docId = safeDocId(p.externalId)
        const docRef = productsRef.doc(docId)
        const existing = await docRef.get()

        const images = Array.isArray(p.images) ? p.images.filter(u => typeof u === 'string' && u) : []
        const tags = Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string' && t) : []

        const categoryId = p.categoryName && categoryMap[p.categoryName.trim()] || null

        const payload = {
          storeId,
          name: p.name,
          slug: slugify(p.name, p.externalId),
          description: p.description ?? null,
          shortDescription: p.shortDescription ?? null,
          price: p.price,
          comparePrice: typeof p.comparePrice === 'number' ? p.comparePrice : null,
          sku: p.sku ?? null,
          stock: typeof p.stock === 'number' ? p.stock : null,
          trackStock: p.trackStock !== undefined ? !!p.trackStock : typeof p.stock === 'number',
          image: images[0] ?? null,
          images: images.length > 0 ? images : null,
          categoryId,
          brand: p.brand ?? null,
          tags: tags.length > 0 ? tags : null,
          active: p.active !== undefined ? !!p.active : true,
          // Source-of-truth markers — never modify externalId after creation.
          externalSource: 'api' as const,
          externalId: p.externalId,
          updatedAt: FieldValue.serverTimestamp(),
          ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        }

        // `set` with `merge: false` so we fully overwrite (POST semantics).
        // Caller is expected to send the full intended state.
        await docRef.set(payload, { merge: false })
        if (existing.exists) updated++
        else created++
      } catch (err) {
        const e = err as Error
        errors.push({ externalId: p.externalId, error: e.message })
      }
    }

    return res.status(200).json({ created, updated, errors })
  } catch (err) {
    const e = err as Error
    console.error('[v1/products] error:', e)
    return res.status(500).json({ error: 'Internal server error', details: e.message })
  }
}
