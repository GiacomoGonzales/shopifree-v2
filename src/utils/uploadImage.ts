/**
 * uploadImage — punto único de subida de imágenes NUEVAS.
 * =====================================================
 * Objetivo de la migración Cloudinary → Cloudflare R2 (egress $0):
 * que las imágenes nuevas vayan a R2 sin arriesgar el SaaS en vivo.
 *
 * Estrategia (idéntica a la que funcionó en Cobrify):
 *  - Feature flag `shouldUploadToR2()`: arranca en una allowlist (cuentas de
 *    prueba) y, cuando esté validado, se pone `R2_UPLOAD_FOR_ALL = true`.
 *  - Si la subida a R2 falla por lo que sea, cae a Cloudinary automáticamente
 *    (respaldo) → el usuario nunca se queda sin poder subir.
 *  - El servido no cambia: optimizeImage() ya deja pasar sin tocar las URLs
 *    que no son de Cloudinary (incluidas las de R2).
 *
 * NOTA: el flag arranca OFF (allowlist vacía, FOR_ALL=false). No cambia nada en
 * producción hasta que se agregue una cuenta o se active para todos.
 */

import { auth } from '../lib/firebase'
import { apiUrl } from './apiBase'

// === Feature flag ===
// Cuando R2 esté 100% probado, poner en true para mandar TODAS las subidas
// nuevas a R2 (Cloudinary queda solo como respaldo de emergencia).
const R2_UPLOAD_FOR_ALL = false

// storeId de las tiendas de prueba que ya suben a R2 (piloto).
const R2_UPLOAD_ALLOWLIST: string[] = []

// Emails de prueba: si el usuario logueado es uno de estos, sube a R2 sin
// importar en qué tienda esté.
const R2_UPLOAD_EMAIL_ALLOWLIST: string[] = [
  'giiacomo@gmail.com', // piloto: solo esta cuenta sube a R2; el resto sigue en Cloudinary
]

export function shouldUploadToR2(storeId?: string): boolean {
  if (R2_UPLOAD_FOR_ALL) return true
  if (storeId && R2_UPLOAD_ALLOWLIST.includes(storeId)) return true
  const email = (auth?.currentUser?.email || '').toLowerCase()
  if (email && R2_UPLOAD_EMAIL_ALLOWLIST.some(e => e.toLowerCase() === email)) return true
  return false
}

// === Cloudinary (subida unsigned, centralizada) ===
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export interface UploadOptions {
  /** Carpeta/prefijo. En Cloudinary se usa como `folder`; en R2 como prefijo de la key. */
  folder?: string
  /** Solo Cloudinary: 'auto:good', etc. (en R2 no aplica, se sube tal cual). */
  quality?: string
  /** Tienda a la que pertenece la subida (para el flag por tienda). */
  storeId?: string
}

/**
 * Sube un archivo a Cloudinary vía unsigned upload. Devuelve la secure_url.
 * Centraliza la lógica que hoy está duplicada en ~8 componentes.
 */
export async function uploadToCloudinary(file: File | Blob, opts: UploadOptions = {}): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary no configurado (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)')
  }
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  if (opts.folder) formData.append('folder', opts.folder)
  if (opts.quality) formData.append('quality', opts.quality)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message || 'Error al subir imagen a Cloudinary')
  }
  const data = await res.json()
  return data.secure_url as string
}

// === R2 (vía proxy en Vercel) ===
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
  if (!token) throw new Error('No autenticado para subir a R2')
  const dataBase64 = await blobToBase64(file)
  const res = await fetch(apiUrl('/api/upload-image-r2'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dataBase64, contentType: (file as File).type || 'image/webp', folder }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error || `R2 HTTP ${res.status}`)
  }
  const data = await res.json()
  if (!data?.url) throw new Error('R2 no devolvió URL')
  return data.url as string
}

/**
 * Sube una imagen (idealmente ya comprimida a webp) y devuelve su URL pública.
 * - Cuentas con el flag activo: R2, con respaldo Cloudinary si falla.
 * - Resto: Cloudinary, como siempre.
 */
export async function uploadImage(
  file: File | Blob,
  { folder = 'uploads', quality, storeId }: UploadOptions = {}
): Promise<string> {
  if (shouldUploadToR2(storeId)) {
    try {
      return await uploadToR2(file, folder)
    } catch (e) {
      console.warn('⚠️ Subida a R2 falló, usando Cloudinary de respaldo:', e instanceof Error ? e.message : e)
      return uploadToCloudinary(file, { folder, quality })
    }
  }
  return uploadToCloudinary(file, { folder, quality })
}
