/**
 * uploadImage — punto único de subida de imágenes NUEVAS.
 * =====================================================
 * Todas las imágenes van a Cloudflare R2 (egress $0). Cloudinary quedó fuera
 * del camino de subida: no recibe nada nuevo.
 *
 * Historia, para que no se repita: hasta el 31/07/2026 había un respaldo que
 * mandaba a Cloudinary cuando R2 fallaba. Como el límite de body de Vercel es
 * ~4.5 MB y base64 infla ~1.37x, TODA foto de más de ~3.2 MB fallaba en R2 y
 * terminaba en Cloudinary en silencio (solo un console.warn). Así siguió
 * creciendo una cuenta que se suponía migrada.
 *
 * Ahora compressImage() deja cualquier foto en ~200-300 KB antes de subir, así
 * que el límite de Vercel dejó de ser alcanzable y el respaldo perdió sentido.
 * En su lugar hay un reintento: si R2 falla por algo transitorio (red, cold
 * start), se reintenta; si falla de verdad, el error sube al usuario en vez de
 * desviarse a otro proveedor.
 */

import { auth } from '../lib/firebase'
import { apiUrl } from './apiBase'
import { compressImage, type OutputMime } from './compressImage'

export interface UploadOptions {
  /** Carpeta/prefijo de la key en R2. */
  folder?: string
  /**
   * Lado largo máximo en px antes de subir. Default 2048, que cubre de sobra
   * la galería de producto. Los heroes se sirven a todo el ancho y piden más
   * (ver SIZE_CONFIGS.hero en cloudinary.ts).
   */
  maxDimension?: number
  /**
   * Formato de salida. Default WebP. Usar 'image/png' cuando el destino lo
   * exige (ver el ícono de la app en MiApp.tsx).
   */
  mimeType?: OutputMime
  /** Sube el archivo tal cual, sin redimensionar ni reencodar. */
  skipCompression?: boolean
}

/** Error de subida que conserva el código HTTP para decidir si reintentar. */
class UploadError extends Error {
  // Campo explícito y no parámetro-propiedad: el proyecto compila con
  // `erasableSyntaxOnly`, que prohíbe la forma abreviada en el constructor.
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'UploadError'
    this.status = status
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const r = (reader.result || '') as string
      const c = r.indexOf(',')
      resolve(c >= 0 ? r.slice(c + 1) : r)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function uploadToR2(file: File | Blob, folder: string): Promise<string> {
  const token = await auth?.currentUser?.getIdToken()
  // 401 para que isRetryable() no lo reintente: sin sesión no mejora esperando.
  if (!token) throw new UploadError('No autenticado para subir a R2', 401)
  const dataBase64 = await blobToBase64(file)
  const res = await fetch(apiUrl('/api/upload-image-r2'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dataBase64, contentType: (file as File).type || 'image/webp', folder }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new UploadError(e?.error || `R2 HTTP ${res.status}`, res.status)
  }
  const data = await res.json()
  if (!data?.url) throw new UploadError('R2 no devolvió URL')
  return data.url as string
}

/**
 * Un 4xx no mejora reintentando: la imagen es muy grande, el tipo no está
 * soportado o el token no sirve. Solo se reintentan fallos de red y 5xx.
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof UploadError && typeof err.status === 'number') {
    return err.status >= 500
  }
  return true // fetch rechazado = problema de red
}

const RETRY_DELAYS_MS = [800, 2000]

/**
 * Sube una imagen a R2 y devuelve su URL pública.
 *
 * Comprime siempre antes de subir (salvo `skipCompression`). Si la subida
 * falla por algo transitorio reintenta dos veces; si igual falla, lanza para
 * que el llamador muestre el error.
 */
export async function uploadImage(
  file: File | Blob,
  { folder = 'uploads', maxDimension, mimeType, skipCompression }: UploadOptions = {}
): Promise<string> {
  const payload = skipCompression ? file : await compressImage(file, { maxDimension, mimeType })

  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await uploadToR2(payload, folder)
    } catch (err) {
      lastError = err
      if (attempt === RETRY_DELAYS_MS.length || !isRetryable(err)) break
      console.warn(
        `Subida a R2 falló (intento ${attempt + 1}), reintentando:`,
        err instanceof Error ? err.message : err
      )
      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]))
    }
  }
  throw lastError instanceof Error ? lastError : new UploadError('Error subiendo la imagen')
}
