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

// La descarga desde URL (modo `sourceUrl`) no pasa por el body de Vercel, así
// que puede permitirse más que los 4 MB del modo base64.
const MAX_FETCH_BYTES = 15 * 1024 * 1024
const FETCH_TIMEOUT_MS = 20_000

/**
 * Valida una URL de origen antes de que el servidor la descargue.
 *
 * Esto es una petición saliente hecha por NUESTRO servidor con la red interna
 * a su alcance: sin filtro, alguien autenticado podría usarla para sondear
 * direcciones privadas o metadatos de la nube (SSRF). Se exige http/https y se
 * bloquean localhost, los rangos privados y el link-local de metadatos.
 */
function assertSafeSourceUrl(raw: string): URL {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error('URL de origen inválida')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Solo se admiten URLs http o https')
  }
  const host = u.hostname.toLowerCase()
  const bloqueado =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) || // incluye 169.254.169.254 (metadatos)
    host.endsWith('.internal') ||
    host.endsWith('.local')
  if (bloqueado) throw new Error('URL de origen no permitida')
  return u
}

/**
 * Deduce el formato leyendo la firma del archivo.
 *
 * No se confía en el `content-type` del origen porque miente seguido: el CDN
 * de Rappi, por ejemplo, sirve varios PNG declarados como
 * `multipart/form-data`. Validar solo por cabecera rechazaría imágenes
 * perfectamente válidas.
 */
function sniffImageType(b: Buffer): string | null {
  if (b.length < 12) return null
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  if (b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (b.slice(4, 8).toString('ascii') === 'ftyp' && b.slice(8, 12).toString('ascii').startsWith('avif')) return 'image/avif'
  return null
}

/** Descarga una imagen remota con tope de tamaño y de tiempo. */
async function fetchRemoteImage(raw: string): Promise<{ buffer: Buffer; contentType: string }> {
  const u = assertSafeSourceUrl(raw)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { Accept: 'image/*' },
    })
    if (!resp.ok) throw new Error(`El origen respondió ${resp.status}`)

    // Corta temprano si el servidor declara un tamaño excesivo.
    const declared = Number(resp.headers.get('content-length') || 0)
    if (declared && declared > MAX_FETCH_BYTES) {
      throw new Error('La imagen de origen es demasiado grande')
    }

    const buffer = Buffer.from(await resp.arrayBuffer())
    if (!buffer.length) throw new Error('La imagen de origen está vacía')
    if (buffer.length > MAX_FETCH_BYTES) {
      throw new Error('La imagen de origen es demasiado grande')
    }

    // Manda la firma del archivo; la cabecera solo se usa como respaldo.
    const declaredType = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const contentType = sniffImageType(buffer) || (EXT_BY_TYPE[declaredType] ? declaredType : null)
    if (!contentType) {
      throw new Error(`El origen no devolvió una imagen soportada (${declaredType || 'sin tipo'})`)
    }
    return { buffer, contentType }
  } finally {
    clearTimeout(timer)
  }
}

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

    const { dataBase64, sourceUrl, contentType, folder } = (req.body || {}) as {
      dataBase64?: string; sourceUrl?: string; contentType?: string; folder?: string
    }

    let buffer: Buffer
    let ct: string

    if (sourceUrl && typeof sourceUrl === 'string') {
      // Modo importación: el servidor baja la imagen y la sube a R2. Se hace
      // acá y no en el navegador por dos motivos: el origen normalmente no
      // manda cabeceras CORS, y así se evita el límite de ~4.5 MB del body de
      // Vercel al no tener que pasar el archivo por el cliente.
      try {
        const remota = await fetchRemoteImage(sourceUrl)
        buffer = remota.buffer
        ct = remota.contentType
      } catch (e) {
        return res.status(400).json({ error: e instanceof Error ? e.message : 'No pude traer la imagen de origen' })
      }
    } else {
      if (!dataBase64 || typeof dataBase64 !== 'string') {
        return res.status(400).json({ error: 'Falta la imagen (dataBase64 o sourceUrl)' })
      }
      ct = String(contentType || 'image/webp').toLowerCase()
      if (!EXT_BY_TYPE[ct]) return res.status(400).json({ error: 'Tipo de imagen no soportado: ' + ct })

      buffer = Buffer.from(dataBase64, 'base64')
      if (!buffer.length) return res.status(400).json({ error: 'Imagen vacía' })
      if (buffer.length > MAX_BYTES) {
        return res.status(413).json({ error: 'Imagen demasiado grande (máx 4MB). Comprime antes de subir.' })
      }
    }

    const ext = EXT_BY_TYPE[ct]

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
