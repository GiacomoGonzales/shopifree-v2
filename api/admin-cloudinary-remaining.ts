import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Verificador (solo lectura): escanea TODAS las tiendas y cuenta cuántas URLs
 * de Cloudinary quedan referenciadas en Firestore, por tipo. NO modifica nada.
 *
 * Sirve para decidir, con datos, si ya es seguro borrar Cloudinary: cuando
 * `remaining.total` llegue a ~0, nada en la app sigue apuntando a Cloudinary.
 *
 * Auth: admin. Env: FIREBASE_*.
 */

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']
const STORE_IMAGE_FIELDS = ['logo', 'logoLandscape', 'heroImage', 'heroImageMobile', 'favicon']

function ensureFirebase() {
  if (getApps().length) return
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase env vars')
  }
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

const isCloud = (u: unknown): u is string => typeof u === 'string' && u.includes('res.cloudinary.com')

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)))
  }
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    ensureFirebase()
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No autenticado' })
    let email = ''
    try { email = (await getAuth().verifyIdToken(token)).email || '' } catch { return res.status(401).json({ error: 'Token inválido' }) }
    if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ error: 'Solo admin' })

    const db = getFirestore()
    const storesSnap = await db.collection('stores').get()

    const remaining = { storeImages: 0, productImage: 0, productGallery: 0, variantImages: 0, categoryImages: 0, productVideos: 0 }
    let scannedProducts = 0
    const perStore: { id: string; name: string; count: number }[] = []

    await inBatches(storesSnap.docs, 12, async (storeDoc) => {
      const s = storeDoc.data()
      let storeCount = 0

      for (const f of STORE_IMAGE_FIELDS) if (isCloud(s[f])) { remaining.storeImages++; storeCount++ }

      const [prodSnap, catSnap] = await Promise.all([
        storeDoc.ref.collection('products').get(),
        storeDoc.ref.collection('categories').get(),
      ])
      scannedProducts += prodSnap.size

      for (const p of prodSnap.docs) {
        const d = p.data()
        if (isCloud(d.image)) { remaining.productImage++; storeCount++ }
        if (Array.isArray(d.images)) for (const u of d.images) if (isCloud(u)) { remaining.productGallery++; storeCount++ }
        if (isCloud(d.video)) { remaining.productVideos++; storeCount++ }
        if (Array.isArray(d.variations)) for (const v of d.variations) if (Array.isArray(v?.options)) for (const o of v.options) if (isCloud(o?.image)) { remaining.variantImages++; storeCount++ }
        if (Array.isArray(d.combinations)) for (const c of d.combinations) if (isCloud(c?.image)) { remaining.variantImages++; storeCount++ }
      }

      for (const c of catSnap.docs) if (isCloud(c.data().image)) { remaining.categoryImages++; storeCount++ }

      if (storeCount > 0) perStore.push({ id: storeDoc.id, name: s.name || storeDoc.id, count: storeCount })
    })

    const total =
      remaining.storeImages + remaining.productImage + remaining.productGallery +
      remaining.variantImages + remaining.categoryImages + remaining.productVideos

    perStore.sort((a, b) => b.count - a.count)

    return res.status(200).json({
      scannedStores: storesSnap.size,
      scannedProducts,
      remaining: { ...remaining, total },
      topStores: perStore.slice(0, 20),
    })
  } catch (err) {
    console.error('[admin-cloudinary-remaining]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error verificando' })
  }
}
