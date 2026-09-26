import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { isAdminToken } from './_shared/admin.js'
import {
  getDb, storeRef, privateWaRef, waNumberRef, storeMediaPrefix, deleteR2Prefix, unsubscribeWabaIfUnused, type PrivateWa,
} from './_shared/whatsappInbox.js'

/**
 * Eliminar cuenta — borra los datos de la tienda que el navegador NO puede
 * borrar (docs solo-servidor segun firestore.rules) o que quedarian huerfanos.
 *
 * POST { action: 'delete-account-data', storeId } con
 * Authorization: Bearer <Firebase ID token>. El uid tiene que ser el dueño de
 * la tienda (stores/{id}.ownerId) o admin.
 *
 * Lo llama "Mi Cuenta → Eliminar mi cuenta" (src/pages/dashboard/Account.tsx)
 * ANTES de borrar productos/categorias/pedidos, el doc de la tienda, el
 * subdominio, users/{uid} y el usuario de Auth (eso sigue en el cliente).
 *
 * Que borra:
 *  1. Best effort: des-suscribe la app de la WABA (DELETE /{waba}/subscribed_apps
 *     con el token de la tienda) para que Meta deje de mandar webhooks.
 *  2. waNumbers/{phoneNumberId} que apunten a ESTA tienda.
 *  3. Best effort: la media de ShopiChat en R2 (whatsapp/{storeId}/).
 *  4. Recursivo (con subcolecciones): waConversations (+ messages), waSettings,
 *     private (whatsapp, ai, botWebhook, payments, apiRate), customers, aiUsage,
 *     coupons y payment_checkouts.
 *  5. waUnprocessed de esta tienda (copias crudas de webhooks que fallaron).
 *
 * Si falla Meta o R2 se sigue (se informa en la respuesta); si falla Firestore
 * responde 500 y el cliente aborta la eliminacion (asi no se pierde el doc de
 * la tienda, que es lo que permite reintentar).
 */

const SUBCOLECCIONES = [
  'waConversations', 'waSettings', 'private', 'customers', 'aiUsage', 'coupons', 'payment_checkouts',
] as const

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  if (body.action !== 'delete-account-data') return res.status(400).json({ error: 'INVALID_ACTION' })
  const storeId = typeof body.storeId === 'string' ? body.storeId.trim() : ''
  // Es id de documento: con '/' apuntaria a otra ruta de Firestore.
  if (!storeId || !/^[A-Za-z0-9_-]{1,128}$/.test(storeId)) return res.status(400).json({ error: 'MISSING_STORE' })

  try {
    const db = getDb()
    const header = req.headers.authorization || ''
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!idToken) return res.status(401).json({ error: 'UNAUTHENTICATED' })
    let decoded: DecodedIdToken
    try {
      decoded = await getAuth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'INVALID_TOKEN' })
    }

    const storeSnap = await storeRef(storeId).get()
    if (!storeSnap.exists) return res.status(404).json({ error: 'STORE_NOT_FOUND' })
    if (storeSnap.data()?.ownerId !== decoded.uid && !isAdminToken(decoded)) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }

    const avisos: string[] = []

    // 1. Meta: que deje de mandar webhooks de esta WABA.
    const wa = (await privateWaRef(storeId).get()).data() as Partial<PrivateWa> | undefined
    const unsubscribed = await unsubscribeWabaIfUnused(storeId, wa?.accessToken, wa?.wabaId)
    if (wa?.accessToken && !unsubscribed) avisos.push('waba_unsubscribe_skipped')

    // 2. Mapeos numero → tienda (el guardado y cualquier otro que apunte aca).
    const mapeos = await db.collection('waNumbers').where('storeId', '==', storeId).get()
    const refs = new Map(mapeos.docs.map(d => [d.id, d.ref]))
    if (wa?.phoneNumberId && !refs.has(wa.phoneNumberId)) {
      const m = await waNumberRef(wa.phoneNumberId).get()
      if (m.exists && m.data()?.storeId === storeId) refs.set(m.id, m.ref)
    }
    await Promise.all([...refs.values()].map(r => r.delete()))

    // 3. Media en R2.
    let r2Borrados = 0
    try {
      r2Borrados = await deleteR2Prefix(storeMediaPrefix(storeId))
    } catch (e) {
      console.warn(`[account-delete] R2 fallo (${storeId}):`, (e as Error).message)
      avisos.push('r2_failed')
    }

    // 4. Subcolecciones (recursiveDelete baja tambien a messages/ etc.).
    for (const name of SUBCOLECCIONES) {
      await db.recursiveDelete(storeRef(storeId).collection(name))
    }

    // 5. Webhooks sin procesar de esta tienda.
    const sinProcesar = await db.collection('waUnprocessed').where('storeId', '==', storeId).get()
    if (!sinProcesar.empty) {
      const writer = db.bulkWriter()
      sinProcesar.docs.forEach(d => { void writer.delete(d.ref) })
      await writer.close()
    }

    console.log(`[account-delete] ${storeId}: datos borrados (uid ${decoded.uid}, r2 ${r2Borrados}, avisos ${avisos.join(',') || '-'})`)
    return res.status(200).json({ ok: true, waNumbers: refs.size, r2Deleted: r2Borrados, warnings: avisos })
  } catch (err) {
    console.error(`[account-delete] ${storeId} fallo:`, (err as Error).message)
    return res.status(500).json({ error: 'INTERNAL', message: 'Error interno' })
  }
}

// Una tienda con mucho historial de chats puede tardar en borrarse.
export const config = {
  maxDuration: 60,
}
