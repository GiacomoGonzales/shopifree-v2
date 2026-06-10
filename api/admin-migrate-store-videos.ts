import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Migración de VIDEOS Cloudinary → Cloudflare Stream, una tienda a la vez (admin).
 *
 * Por cada producto cuyo `video` aún viva en res.cloudinary.com, le pide a
 * Stream que lo COPIE directo desde esa URL (Stream lo descarga solo, no pasa
 * por aquí), y reescribe `product.video` con el manifest HLS de Stream.
 * Guarda backup en `video_streamBackup` y NUNCA borra de Cloudinary.
 *
 * - Idempotente: los videos que ya apuntan a Stream se saltan.
 * - `dryRun: true` solo cuenta.
 * - `limit` corta por llamada; la UI vuelve a llamar hasta `remaining` = 0.
 * - La codificación en Stream es asíncrona: el manifest queda listo en
 *   segundos/minutos. El original de Cloudinary queda intacto como respaldo.
 *
 * Auth: admin. Env: FIREBASE_*, CLOUDFLARE_STREAM_TOKEN, (CLOUDFLARE_ACCOUNT_ID|R2_ACCOUNT_ID)
 */

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

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

const isCloudinaryVideo = (url: unknown): url is string =>
  typeof url === 'string' && url.includes('res.cloudinary.com')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    ensureFirebase()

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

    const { storeId, dryRun = false, limit = 20 } = (req.body || {}) as {
      storeId?: string; dryRun?: boolean; limit?: number
    }
    if (!storeId) return res.status(400).json({ error: 'Falta storeId' })

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
    const streamToken = process.env.CLOUDFLARE_STREAM_TOKEN
    if (!accountId || !streamToken) return res.status(500).json({ error: 'Cloudflare Stream no configurado' })

    const db = getFirestore()
    const storeRef = db.collection('stores').doc(storeId)
    const storeSnap = await storeRef.get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'Tienda no encontrada' })

    const productsSnap = await storeRef.collection('products').get()
    const withVideo = productsSnap.docs.filter(d => isCloudinaryVideo(d.data().video))
    const totalCloudinary = withVideo.length

    if (dryRun) {
      return res.status(200).json({
        storeId,
        storeName: storeSnap.data()?.name || storeId,
        totalCloudinary,
        products: productsSnap.size,
        categories: 0,
      })
    }

    let migrated = 0
    let errors = 0
    const errorSamples: string[] = []

    for (const doc of withVideo) {
      if (migrated >= limit) break
      const cloudinaryUrl = doc.data().video as string
      try {
        const r = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/copy`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${streamToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cloudinaryUrl }),
          }
        )
        const d = await r.json()
        if (!r.ok || !d?.success || !d.result?.uid) {
          throw new Error(d?.errors?.[0]?.message || `Stream HTTP ${r.status}`)
        }
        const uid = d.result.uid
        await doc.ref.update({
          video: `https://videodelivery.net/${uid}/manifest/video.m3u8`,
          video_streamBackup: cloudinaryUrl,
        })
        migrated++
      } catch (e) {
        errors++
        if (errorSamples.length < 5) errorSamples.push((e as Error).message)
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
    console.error('[admin-migrate-store-videos]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error en migración de videos' })
  }
}
