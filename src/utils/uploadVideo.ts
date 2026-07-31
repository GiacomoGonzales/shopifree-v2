/**
 * uploadVideo — subida de videos NUEVOS a Cloudflare Stream.
 *
 * Todos los videos van a Stream. Cloudinary ya no recibe videos nuevos: el
 * flag de piloto y la rama de respaldo se quitaron el 31/07/2026, una vez
 * validado.
 *
 * Flujo de subida directa a Stream:
 *  1) /api/stream-upload-url da una uploadURL one-time + el uid del video.
 *  2) El navegador sube el archivo directo a esa uploadURL (no pasa por Vercel).
 *  3) Guardamos en product.video el manifest HLS:
 *     https://videodelivery.net/<uid>/manifest/video.m3u8
 */

import { auth } from '../lib/firebase'
import { apiUrl } from './apiBase'

/** Sube un video a Cloudflare Stream y devuelve la URL del manifest HLS. */
export async function uploadVideoToStream(file: File): Promise<string> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('No autenticado')

  // 1) Pedir URL de subida directa
  const res = await fetch(apiUrl('/api/stream-upload-url'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ maxDurationSeconds: 120 }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Stream HTTP ${res.status}`)
  const { uploadURL, uid } = data as { uploadURL?: string; uid?: string }
  if (!uploadURL || !uid) throw new Error('Stream no devolvió uploadURL/uid')

  // 2) Subir el archivo directo a Stream
  const form = new FormData()
  form.append('file', file)
  const up = await fetch(uploadURL, { method: 'POST', body: form })
  if (!up.ok) throw new Error(`Subida a Stream falló (${up.status})`)

  // 3) Manifest HLS para guardar
  return `https://videodelivery.net/${uid}/manifest/video.m3u8`
}
