import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

/**
 * Migración Cloudinary → Cloudflare R2, UNA tienda a la vez (admin).
 *
 * Copia FIEL (sin transformar) cada imagen de la tienda que aún viva en
 * res.cloudinary.com hacia el bucket R2, conservando la misma ruta (key), y
 * reescribe la URL en Firestore para que la app la sirva desde R2 (egress $0).
 * Guarda un BACKUP de cada original (`<campo>_r2Backup`) para poder revertir.
 *
 * - NUNCA borra de Cloudinary (el original queda intacto hasta el cleanup final).
 * - Idempotente: las URLs que ya apuntan a R2 se saltan.
 * - `dryRun: true` solo cuenta (no descarga, sube ni modifica nada).
 * - `limit` corta el trabajo por llamada para no exceder el timeout; la UI
 *   vuelve a llamar hasta que `remaining` sea 0.
 *
 * Auth: Firebase ID token de un admin (ADMIN_EMAILS).
 * Env: FIREBASE_*, R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_URL,
 *      R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

// Campos de imagen por documento (no incluye `video`: eso va a Stream aparte).
const STORE_SCALAR_FIELDS = ['logo', 'logoLandscape', 'heroImage', 'heroImageMobile']
const PRODUCT_SCALAR_FIELDS = ['image']
const PRODUCT_ARRAY_FIELDS = ['images']
const CATEGORY_SCALAR_FIELDS = ['image']

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

let _r2: S3Client | null = null
function getR2(): S3Client {
  if (_r2) return _r2
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error('R2 no configurado')
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _r2
}

const isCloudinary = (url: unknown): url is string =>
  typeof url === 'string' && url.includes('res.cloudinary.com')

/**
 * Deriva la key R2 desde una URL de Cloudinary, conservando carpeta + extensión.
 * .../image/upload/v123/shopifree/products/abc.jpg  ->  shopifree/products/abc.jpg
 * Quita un eventual segmento de transformación (con comas) y el `v123/`.
 */
function cloudinaryUrlToR2Key(url: string): string | null {
  const i = url.indexOf('/upload/')
  if (i < 0) return null
  let rest = url.slice(i + '/upload/'.length)
  // quitar query
  rest = rest.split('?')[0]
  const parts = rest.split('/')
  // quitar segmento de transformación inicial (ej: c_fill,w_400,...)
  if (parts.length && /[,]/.test(parts[0]) && /^[a-z]{1,3}_/.test(parts[0])) parts.shift()
  // quitar versión (v123)
  if (parts.length && /^v\d+$/.test(parts[0])) parts.shift()
  const key = parts.join('/')
  return key || null
}

/** Descarga la imagen original y la sube a R2 con la misma key. Devuelve la URL pública R2. */
async function copyToR2(cloudinaryUrl: string, publicUrl: string, bucket: string): Promise<string> {
  const key = cloudinaryUrlToR2Key(cloudinaryUrl)
  if (!key) throw new Error('No se pudo derivar la key de: ' + cloudinaryUrl)
  const resp = await fetch(cloudinaryUrl)
  if (!resp.ok) throw new Error(`Descarga falló (${resp.status})`)
  const contentType = resp.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await resp.arrayBuffer())
  await getR2().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${publicUrl.replace(/\/$/, '')}/${key}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    ensureFirebase()

    // Auth admin
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'No autenticado' })
    let email = ''
    try {
      const decoded = await getAuth().verifyIdToken(token)
      email = decoded.email || ''
    } catch {
      return res.status(401).json({ error: 'Token inválido' })
    }
    if (!ADMIN_EMAILS.includes(email)) return res.status(403).json({ error: 'Solo admin' })

    const { storeId, dryRun = false, limit = 60 } = (req.body || {}) as {
      storeId?: string; dryRun?: boolean; limit?: number
    }
    if (!storeId) return res.status(400).json({ error: 'Falta storeId' })

    const bucket = process.env.R2_BUCKET
    const publicUrl = process.env.R2_PUBLIC_URL
    if (!bucket || !publicUrl) return res.status(500).json({ error: 'R2_BUCKET / R2_PUBLIC_URL no configurados' })

    const db = getFirestore()
    const storeRef = db.collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Tienda no encontrada' })

    const [productsSnap, categoriesSnap] = await Promise.all([
      storeRef.collection('products').get(),
      storeRef.collection('categories').get(),
    ])

    // Armar la lista de "documentos con campos de imagen" a revisar.
    type DocTask = { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData; scalars: string[]; arrays: string[] }
    const tasks: DocTask[] = []
    tasks.push({ ref: storeRef, data: storeSnap.data() || {}, scalars: STORE_SCALAR_FIELDS, arrays: [] })
    productsSnap.docs.forEach(d => tasks.push({ ref: d.ref, data: d.data(), scalars: PRODUCT_SCALAR_FIELDS, arrays: PRODUCT_ARRAY_FIELDS }))
    categoriesSnap.docs.forEach(d => tasks.push({ ref: d.ref, data: d.data(), scalars: CATEGORY_SCALAR_FIELDS, arrays: [] }))

    // Contar total de imágenes de Cloudinary pendientes.
    let totalCloudinary = 0
    for (const t of tasks) {
      for (const f of t.scalars) if (isCloudinary(t.data[f])) totalCloudinary++
      for (const f of t.arrays) {
        const arr = t.data[f]
        if (Array.isArray(arr)) for (const u of arr) if (isCloudinary(u)) totalCloudinary++
      }
    }

    if (dryRun) {
      return res.status(200).json({
        storeId,
        storeName: storeSnap.data()?.name || storeId,
        totalCloudinary,
        products: productsSnap.size,
        categories: categoriesSnap.size,
      })
    }

    // Migrar hasta `limit` imágenes en esta llamada.
    let migrated = 0
    let errors = 0
    const errorSamples: string[] = []

    for (const t of tasks) {
      if (migrated >= limit) break
      const updates: FirebaseFirestore.DocumentData = {}

      // Campos escalares
      for (const f of t.scalars) {
        if (migrated >= limit) break
        const url = t.data[f]
        if (!isCloudinary(url)) continue
        try {
          const newUrl = await copyToR2(url, publicUrl, bucket)
          updates[f] = newUrl
          updates[`${f}_r2Backup`] = url
          migrated++
        } catch (e) {
          errors++
          if (errorSamples.length < 5) errorSamples.push(`${f}: ${(e as Error).message}`)
        }
      }

      // Campos array (ej: images[])
      for (const f of t.arrays) {
        if (migrated >= limit) break
        const arr = t.data[f]
        if (!Array.isArray(arr) || !arr.some(isCloudinary)) continue
        const newArr: string[] = []
        let changed = false
        for (const u of arr) {
          if (migrated >= limit) { newArr.push(u); continue }
          if (isCloudinary(u)) {
            try {
              newArr.push(await copyToR2(u, publicUrl, bucket))
              changed = true
              migrated++
            } catch (e) {
              newArr.push(u) // conservar original si falla
              errors++
              if (errorSamples.length < 5) errorSamples.push(`${f}[]: ${(e as Error).message}`)
            }
          } else {
            newArr.push(u)
          }
        }
        if (changed) {
          updates[f] = newArr
          updates[`${f}_r2Backup`] = arr
        }
      }

      if (Object.keys(updates).length > 0) {
        await t.ref.update(updates)
      }
    }

    const remaining = Math.max(0, totalCloudinary - migrated)
    return res.status(200).json({
      storeId,
      storeName: storeSnap.data()?.name || storeId,
      totalCloudinary,
      migrated,
      errors,
      remaining,
      done: remaining === 0,
      ...(errorSamples.length ? { errorSamples } : {}),
    })
  } catch (err) {
    console.error('[admin-migrate-store-r2]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error en migración' })
  }
}
