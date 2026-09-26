/**
 * API pública de ShopiChat para bots propios (fase 3C: "conecta tu propio bot").
 *
 * Un solo handler para todas las rutas: vercel.json reescribe
 * /api/v1/whatsapp/:path* → /api/v1/whatsapp?route=:path* (las rutas
 * dinámicas anidadas bajo un index.ts caen en el fallback del SPA; mismo
 * motivo que api/v1/orders/index.ts).
 *
 *   POST /api/v1/whatsapp/messages        { waId, text }            → texto
 *                                         { waId, productId }       → tarjeta de producto
 *                                         (text + productId: primero el texto)
 *   POST /api/v1/whatsapp/templates       { phone | waId, name, language, params }
 *   POST /api/v1/whatsapp/handoff         { waId, reason }
 *   GET  /api/v1/whatsapp/conversations/{waId}/messages?limit=20   (máx. 50)
 *
 * Auth: Authorization: Bearer sfk_... (la API key de la tienda, la misma de
 * api/api-keys.ts; hoy las keys no tienen scopes: una key da acceso completo).
 * Exige plan Business (403 PLAN_REQUIRED) y WhatsApp conectado (409 NOT_CONNECTED).
 *
 * Reglas de envío (las mismas que el piloto automático):
 *  - texto / tarjeta solo con la ventana de 24 h abierta (409 WINDOW_CLOSED;
 *    fuera de ventana solo plantillas), sin baja (409 OPTED_OUT);
 *  - si la conversación está derivada a una persona (aiPaused) → 409
 *    CONVERSATION_PAUSED, salvo { ignorePause: true };
 *  - máx. BOT_API_PER_CONV_HOUR envíos libres por conversación y hora (429).
 * Rate limit: RATE_PER_MIN pedidos por minuto por key (429 RATE_LIMITED + Retry-After).
 *
 * Lo enviado queda en la bandeja con sentBy 'bot'.
 */
import { createHash } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { hasBusinessEffectivePlan, type StorePlanData } from '../../_shared/plan.js'
import { MetaError, isSafeDocId, isValidWaId, normalizePhone } from '../../_shared/whatsappGraph.js'
import { flagTokenError } from '../../_shared/whatsappTokenHealth.js'
import { getDb, storeRef, convRef, getPrivateWa, type PrivateWa } from '../../_shared/whatsappInbox.js'
import { handOffConversation, sendAiText, sendProductCard } from '../../_shared/shopichatAutopilot.js'
import { conversationOut, messageOut } from '../../_shared/shopichatBotWebhook.js'
import { parseTemplateBody, sendTemplateMessage } from '../../_shared/whatsappTemplateSend.js'

const KEY_PREFIX = 'sfk_'
const RATE_PER_MIN = 60
const BOT_API_PER_CONV_HOUR = 30
const MAX_HISTORY = 50

interface Result { status: number; data: Record<string, unknown>; headers?: Record<string, string> }
const ok = (data: Record<string, unknown> = {}): Result => ({ status: 200, data: { ok: true, ...data } })
const fail = (status: number, error: string, message?: string, extra: Record<string, unknown> = {}): Result =>
  ({ status, data: { error, ...(message ? { message } : {}), ...extra } })

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const waIdOf = (v: unknown) => {
  const s = str(v, 128)
  return isValidWaId(s) ? s : ''
}

async function verifyApiKey(req: VercelRequest): Promise<{ storeId: string; store: DocumentData } | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token.startsWith(KEY_PREFIX)) return null
  const hash = createHash('sha256').update(token).digest('hex')
  const snap = await getDb().collection('stores').where('apiKey.hash', '==', hash).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  doc.ref
    .update({ 'apiKey.lastUsedAt': FieldValue.serverTimestamp() })
    .catch(err => console.error('[v1/whatsapp] lastUsedAt:', err))
  return { storeId: doc.id, store: doc.data() }
}

/** Ventana fija de 1 minuto por key (la tienda tiene una sola key). null = permitido; si no, segundos a esperar. */
async function takeRate(storeId: string): Promise<number | null> {
  const ref = storeRef(storeId).collection('private').doc('apiRate')
  return getDb().runTransaction(async tx => {
    const d = ((await tx.get(ref)).data()?.whatsapp || {}) as { start?: number; count?: number }
    const now = Date.now()
    const same = typeof d.start === 'number' && now - d.start < 60_000
    const count = same ? Number(d.count) || 0 : 0
    if (count >= RATE_PER_MIN) return Math.max(1, Math.ceil(((d.start as number) + 60_000 - now) / 1000))
    tx.set(ref, { whatsapp: { start: same ? d.start : now, count: count + 1 } }, { merge: true })
    return null
  })
}

/** Tope de envíos libres del bot por conversación y hora. */
async function takeConvQuota(storeId: string, waId: string, n: number): Promise<boolean> {
  const ref = convRef(storeId, waId)
  return getDb().runTransaction(async tx => {
    const c = (await tx.get(ref)).data() || {}
    const h = (c.botApiHour && typeof c.botApiHour === 'object' ? c.botApiHour : {}) as { start?: number; count?: number }
    const now = Date.now()
    const same = typeof h.start === 'number' && now - h.start < 60 * 60 * 1000
    const count = same ? Number(h.count) || 0 : 0
    if (count + n > BOT_API_PER_CONV_HOUR) return false
    tx.set(ref, { botApiHour: { start: same ? h.start : now, count: count + n } }, { merge: true })
    return true
  })
}

function metaFail(e: unknown): Result {
  if (e instanceof MetaError) {
    if (e.metaCode === 131047) return fail(409, 'WINDOW_CLOSED', 'La ventana de 24 horas se cerro. Hace falta una plantilla aprobada.')
    return fail(502, 'META_ERROR', e.metaDetails || e.message, { metaCode: e.metaCode })
  }
  throw e
}

async function requireConnected(storeId: string): Promise<PrivateWa | Result> {
  return (await getPrivateWa(storeId)) || fail(409, 'NOT_CONNECTED', 'La tienda no tiene WhatsApp conectado')
}
const isResult = (x: unknown): x is Result => !!x && typeof x === 'object' && 'status' in x && 'data' in x

// =================== RUTAS ===================

async function postMessage(storeId: string, store: DocumentData, body: Record<string, unknown>): Promise<Result> {
  const waId = waIdOf(body.waId)
  const text = str(body.text, 4096)
  const productId = str(body.productId, 128)
  if (!waId) return fail(400, 'MISSING_WAID', 'waId es obligatorio (telefono con codigo de pais o BSUID)')
  if (!text && !productId) return fail(400, 'MISSING_TEXT', 'Falta text o productId')
  // Es id de documento: sin '/' ni ids raros (mismo criterio que sendProductCard).
  if (productId && !isSafeDocId(productId)) return fail(400, 'INVALID_PRODUCT', 'productId invalido')

  const wa = await requireConnected(storeId)
  if (isResult(wa)) return wa
  const cSnap = await convRef(storeId, waId).get()
  if (!cSnap.exists) return fail(404, 'CONVERSATION_NOT_FOUND')
  const conv = cSnap.data() || {}
  if (conv.optOut === true) return fail(409, 'OPTED_OUT', 'Este contacto pidio no recibir mas mensajes')
  const vence = (conv.windowExpiresAt as Timestamp | null)?.toMillis?.() || 0
  if (Date.now() > vence) {
    return fail(409, 'WINDOW_CLOSED', 'La ventana de 24 horas se cerro. Para escribirle hace falta una plantilla aprobada (POST /templates).', {
      windowExpiredAt: vence ? new Date(vence).toISOString() : null,
    })
  }
  if (conv.aiPaused === true && body.ignorePause !== true) {
    return fail(409, 'CONVERSATION_PAUSED', 'La conversacion esta derivada a una persona. Manda ignorePause: true para escribir igual.')
  }
  if (productId) {
    const p = (await storeRef(storeId).collection('products').doc(productId).get().catch(() => null))?.data()
    if (!p || p.active === false || !p.slug || !p.name) return fail(404, 'PRODUCT_NOT_FOUND')
  }
  if (!(await takeConvQuota(storeId, waId, (text ? 1 : 0) + (productId ? 1 : 0)))) {
    return fail(429, 'CONVERSATION_RATE_LIMITED', `Maximo ${BOT_API_PER_CONV_HOUR} mensajes del bot por conversacion y hora`)
  }

  const ids: string[] = []
  try {
    if (text) ids.push(await sendAiText(storeId, waId, wa, text, {}, {}, 'bot'))
    if (productId) {
      const id = await sendProductCard(storeId, waId, wa, store, productId, 'bot')
      if (id) ids.push(id)
    }
  } catch (e) {
    return metaFail(e)
  }
  return ok({ messageId: ids[ids.length - 1] || null, messageIds: ids })
}

async function postTemplate(storeId: string, body: Record<string, unknown>): Promise<Result> {
  const parsed = parseTemplateBody(body)
  if (!parsed.ok) return fail(parsed.status, parsed.error, parsed.message)
  let waId = waIdOf(body.waId)
  if (!waId) {
    const phone = normalizePhone(body.phone)
    if (!phone) return fail(400, 'INVALID_PHONE', 'Telefono invalido (con codigo de pais, solo digitos)')
    waId = phone
  }
  const wa = await requireConnected(storeId)
  if (isResult(wa)) return wa
  try {
    const r = await sendTemplateMessage(storeId, wa, {
      waId,
      requireExisting: Boolean(body.waId && !body.phone),
      name: parsed.name,
      language: parsed.language,
      params: parsed.params,
      headerText: parsed.headerText,
      headerImageUrl: parsed.headerImageUrl,
      sentBy: 'bot',
    })
    if (!r.ok) return fail(r.status, r.error, r.message)
    return ok({ messageId: r.messageId, waId: r.waId })
  } catch (e) {
    return metaFail(e)
  }
}

async function postHandoff(storeId: string, body: Record<string, unknown>): Promise<Result> {
  const waId = waIdOf(body.waId)
  if (!waId) return fail(400, 'MISSING_WAID')
  const reason = str(body.reason, 200).replace(/\s+/g, ' ') || 'Derivado por el bot'
  try {
    const found = await handOffConversation(storeId, waId, reason, 'bot')
    if (!found) return fail(404, 'CONVERSATION_NOT_FOUND')
  } catch (e) {
    // La conversación ya quedó derivada; lo que falló fue la nota al cliente.
    if (e instanceof MetaError) return ok({ handedOff: true, noteSent: false })
    throw e
  }
  return ok({ handedOff: true })
}

async function getMessages(storeId: string, waId: string, rawLimit: unknown): Promise<Result> {
  if (!isValidWaId(waId)) return fail(400, 'MISSING_WAID')
  const n = Number(typeof rawLimit === 'string' ? rawLimit : 20)
  const limit = Math.min(Math.max(1, Number.isFinite(n) ? Math.floor(n) : 20), MAX_HISTORY)
  const cRef = convRef(storeId, waId)
  const [cSnap, mSnap] = await Promise.all([
    cRef.get(),
    cRef.collection('messages').orderBy('timestamp', 'desc').limit(limit).get(),
  ])
  if (!cSnap.exists) return fail(404, 'CONVERSATION_NOT_FOUND')
  const messages = mSnap.docs
    .filter(d => d.data().direction)
    .map(d => messageOut(d.id, d.data()))
    .reverse() // del más viejo al más nuevo
  return ok({ conversation: conversationOut(waId, cSnap.data() || {}), messages })
}

/** Segmentos de la ruta: de ?route= (rewrite) o, si no vino, del path. */
function routeOf(req: VercelRequest): string[] {
  const q = req.query.route
  let r = Array.isArray(q) ? q.join('/') : typeof q === 'string' ? q : ''
  if (!r) {
    const path = (req.url || '').split('?')[0]
    const i = path.indexOf('/api/v1/whatsapp/')
    if (i >= 0) r = path.slice(i + '/api/v1/whatsapp/'.length)
  }
  try {
    return r.split('/').filter(Boolean).map(s => decodeURIComponent(s))
  } catch {
    return []
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const route = routeOf(req)
  const isGetMessages = route.length === 3 && route[0] === 'conversations' && route[2] === 'messages'
  const post = route.length === 1 && ['messages', 'templates', 'handoff'].includes(route[0])
  if (!isGetMessages && !post) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta desconocida' })
  if (isGetMessages && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (post && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const auth = await verifyApiKey(req)
    if (!auth) return res.status(401).json({ error: 'INVALID_API_KEY', message: 'Invalid or missing API key' })
    const { storeId, store } = auth
    if (!hasBusinessEffectivePlan(store as StorePlanData)) {
      return res.status(403).json({ error: 'PLAN_REQUIRED', message: 'ShopiChat requiere el plan Business' })
    }
    const wait = await takeRate(storeId)
    if (wait !== null) {
      res.setHeader('Retry-After', String(wait))
      return res.status(429).json({ error: 'RATE_LIMITED', message: `Maximo ${RATE_PER_MIN} pedidos por minuto`, retryAfter: wait })
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
    let result: Result
    if (isGetMessages) result = await getMessages(storeId, route[1], req.query.limit)
    else if (route[0] === 'messages') result = await postMessage(storeId, store, body)
    else if (route[0] === 'templates') result = await postTemplate(storeId, body)
    else result = await postHandoff(storeId, body)
    // 190 = token de Meta vencido/revocado: se marca y se avisa al dueño.
    if (result.data.metaCode === 190) await flagTokenError(storeId, new MetaError('token', { code: 190 }))
    return res.status(result.status).json(result.data)
  } catch (err) {
    console.error(`[v1/whatsapp] ${route.join('/')} fallo:`, (err as Error).message)
    return res.status(500).json({ error: 'INTERNAL', message: 'Error interno' })
  }
}

// Una tarjeta de producto baja la foto, la re-sube a R2 y genera la miniatura.
export const config = {
  maxDuration: 60,
}
