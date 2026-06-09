import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

/**
 * Proxy de subida de imágenes a Cloudflare R2 (egress $0).
 *
 * El navegador no puede subir sin firma a R2, así que manda la imagen (base64)
 * a esta función, que la guarda en el bucket y devuelve la URL pública. Mismo
 * patrón probado en Cobrify, adaptado a Vercel.
 *
 * Auth: Firebase ID token (Authorization: Bearer <token>). Cualquier usuario
 * autenticado puede subir SUS imágenes (la key se namespacea bajo su uid).
 *
 * Env vars requeridas (Vercel):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_PUBLIC_URL
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *
 * Nota Vercel: el body va por JSON, y el límite de body es ~4.5MB. La imagen
 * en base64 infla ~1.37x, así que el cliente debe comprimir (webp) antes de
 * subir. Aquí capamos a 4MB decodificados como red de seguridad. Los videos
 * NO pasan por aquí (irán por Cloudflare Stream con subida directa).
 */

const EXT_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const MAX_BYTES = 4 * 1024 * 1024

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

let _client: S3Client | null = null
function getR2Client(): S3Client {
  if (_client) return _client
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 no configurado (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)')
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _client
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    ensureFirebase()

    // Auth
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'No autenticado' })
    let uid: string
    try {
      const decoded = await getAuth().verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const bucket = process.env.R2_BUCKET
    const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
    if (!bucket || !publicUrl) {
      return res.status(500).json({ error: 'R2_BUCKET / R2_PUBLIC_URL no configurados' })
    }

    const { dataBase64, contentType, folder } = (req.body || {}) as {
      dataBase64?: string; contentType?: string; folder?: string
    }
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return res.status(400).json({ error: 'Falta la imagen (dataBase64)' })
    }
    const ct = String(contentType || 'image/webp').toLowerCase()
    const ext = EXT_BY_TYPE[ct]
    if (!ext) return res.status(400).json({ error: 'Tipo de imagen no soportado: ' + ct })

    const buffer = Buffer.from(dataBase64, 'base64')
    if (!buffer.length) return res.status(400).json({ error: 'Imagen vacía' })
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Imagen demasiado grande (máx 4MB). Comprime antes de subir.' })
    }

    const safeFolder =
      String(folder || 'uploads')
        .replace(/[^a-zA-Z0-9/_-]/g, '')
        .replace(/\/+/g, '/')
        .replace(/^\/|\/$/g, '') || 'uploads'
    const rand = Math.random().toString(36).slice(2, 10)
    const key = `${safeFolder}/${uid}/${Date.now()}-${rand}.${ext}`

    await getR2Client().send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: ct,
      CacheControl: 'public, max-age=31536000, immutable',
    }))

    return res.status(200).json({ url: `${publicUrl}/${key}`, key })
  } catch (err) {
    console.error('[upload-image-r2]', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Error subiendo a R2' })
  }
}
