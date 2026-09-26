/**
 * ShopiChat — cliente de la WhatsApp Cloud API (Graph API de Meta).
 *
 * Portado de Cobrify (functions/src/services/whatsappService.js), con una
 * diferencia de fondo: aca es MULTI-TIENDA. No hay un WHATSAPP_TOKEN global;
 * cada tienda conecta su propio numero por Embedded Signup y su token vive en
 * stores/{storeId}/private/whatsapp. Por eso todas las funciones reciben el
 * token por parametro.
 *
 * Este modulo NO toca Firestore: solo habla con Meta. La logica de la bandeja
 * esta en whatsappInbox.ts.
 */

import crypto from 'crypto'

/**
 * Version de la Graph API. Cobrify corre en v26.0 en produccion; la doc de
 * Embedded Signup (sep-2026) muestra ejemplos en v25.0. Si Meta la depreca,
 * se cambia solo aca.
 */
export const GRAPH_VERSION = 'v26.0'
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

/** Milisegundos que dura la ventana de servicio de WhatsApp. */
export const WINDOW_24H_MS = 24 * 60 * 60 * 1000

const GRAPH_TIMEOUT_MS = 15_000

/** Error de Meta con su codigo propio, para poder explicarlo en la UI. */
export class MetaError extends Error {
  metaCode: number | null
  metaSubcode: number | null
  metaDetails: string | null
  httpStatus: number
  constructor(message: string, opts: { code?: number | null; subcode?: number | null; details?: string | null; status?: number } = {}) {
    super(message)
    this.name = 'MetaError'
    this.metaCode = opts.code ?? null
    this.metaSubcode = opts.subcode ?? null
    this.metaDetails = opts.details ?? null
    this.httpStatus = opts.status ?? 0
  }
}

interface GraphErrorBody {
  error?: {
    message?: string
    error_user_msg?: string
    code?: number
    error_subcode?: number
    error_data?: { details?: string }
  }
}

/**
 * fetch a la Graph API con timeout y errores legibles. El token va SIEMPRE en
 * la cabecera (nunca en la URL, que termina en logs).
 */
export async function graphFetch<T = Record<string, unknown>>(
  pathOrUrl: string,
  opts: { token?: string; method?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<T> {
  const url = new URL(pathOrUrl.startsWith('https://') ? pathOrUrl : `${GRAPH_BASE}/${pathOrUrl.replace(/^\//, '')}`)
  // El token va en la cabecera: una URL absoluta (paginacion de Meta) solo se
  // acepta si es de la Graph API, nunca de otro host.
  if (url.protocol !== 'https:' || url.hostname !== 'graph.facebook.com') {
    throw new MetaError('URL de Graph API no permitida')
  }
  for (const [k, v] of Object.entries(opts.query || {})) url.searchParams.set(k, v)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GRAPH_TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {}
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(url.toString(), {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    })
    const data = (await res.json().catch(() => ({}))) as T & GraphErrorBody
    if (!res.ok || data?.error) {
      const e = data?.error || {}
      throw new MetaError(e.error_user_msg || e.message || `Error ${res.status} de Meta`, {
        code: e.code ?? null,
        subcode: e.error_subcode ?? null,
        details: e.error_data?.details ?? null,
        status: res.status,
      })
    }
    return data
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw new MetaError('Meta no respondio a tiempo', { status: 504 })
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// =================== FIRMA DEL WEBHOOK ===================

/**
 * Verifica la cabecera X-Hub-Signature-256 de Meta contra el cuerpo CRUDO.
 * Cualquier reserializacion del JSON cambia los bytes y la firma deja de
 * coincidir, por eso el webhook desactiva el bodyParser.
 */
export function verifyWhatsappSignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string | undefined): boolean {
  if (!appSecret || !signatureHeader || !rawBody?.length) return false
  const esperado = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const a = Buffer.from(esperado)
  const b = Buffer.from(String(signatureHeader))
  // Comparacion en tiempo constante: un === filtra por tiempo cuantos
  // caracteres del principio acerto quien lo intenta.
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// =================== IDENTIDADES (telefono / BSUID) ===================

/**
 * ¿Es un BSUID ("PE.1234…") y no un telefono?
 *
 * Desde 2026 WhatsApp deja usar nombre de usuario y esconder el numero. Si
 * alguien asi escribe y no hablamos con el en 30 dias, Meta manda su BSUID (id
 * que vale solo para esta empresa) en vez del telefono, y para contestarle se
 * usa `recipient` en lugar de `to`.
 */
export const isBsuid = (id: unknown) => /^[A-Z]{2}\.[A-Za-z0-9]+$/.test(String(id || ''))

/**
 * ¿Sirve como id de conversacion (y por lo tanto como id de documento)? Un
 * telefono (solo digitos) o un BSUID. Cualquier otra cosa se rechaza: con una
 * '/' el id se convertiria en una ruta de Firestore.
 */
export const isValidWaId = (id: unknown): id is string => {
  const s = String(id ?? '')
  return (/^\d{5,20}$/.test(s) || isBsuid(s)) && s.length <= 128
}

/**
 * ¿Sirve como id de documento de Firestore? (wamid y demas ids que manda
 * Meta). Sin '/', no '.' ni '..', no __reservados__, largo acotado.
 */
export const isSafeDocId = (id: unknown): id is string => {
  const s = String(id ?? '')
  return s.length > 0 && s.length <= 512 && !s.includes('/') && s !== '.' && s !== '..' && !/^__.*__$/.test(s)
}

/** A quien va el mensaje: `to` para un telefono, `recipient` para un BSUID. */
const recipientOf = (id: string) => (isBsuid(id) ? { recipient: id } : { to: id })

/** Solo digitos, para telefonos que escribe el comerciante. null si no parece un numero. */
export function normalizePhone(raw: unknown): string | null {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^00/, '')
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

// =================== PARSER DEL WEBHOOK ===================

export type WaMessageType =
  | 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location'
  | 'template' | 'interactive' | 'button' | 'reaction' | 'unsupported'

const KNOWN_TYPES = new Set<WaMessageType>([
  'text', 'image', 'audio', 'video', 'document', 'sticker', 'location',
  'template', 'interactive', 'button', 'reaction',
])

export interface WaAccountRef {
  wabaId: string | null
  phoneNumberId: string | null
  displayNumber: string | null
}

export interface WaMediaRef {
  mediaId: string | null
  mimeType: string | null
  filename: string | null
}

export interface ParsedMessage {
  account: WaAccountRef
  /** 'in' = lo escribio el cliente; 'echo' = el comerciante desde la app WhatsApp Business (coexistencia). */
  origin: 'in' | 'echo'
  waMessageId: string
  /** Id de la conversacion: telefono si viene, si no el BSUID. */
  waId: string | null
  phone: string | null
  bsuid: string | null
  username: string | null
  name: string | null
  type: WaMessageType
  rawType: string
  /** Milisegundos (Meta manda segundos). */
  timestamp: number
  text: string
  media: WaMediaRef | null
  replyTo: string | null
  location: { latitude: number | null; longitude: number | null; name: string | null; address: string | null } | null
  reaction: { messageId: string; emoji: string | null } | null
  referral: Record<string, string | null> | null
  raw: unknown
}

export interface ParsedStatus {
  account: WaAccountRef
  waMessageId: string
  status: string | null
  timestamp: number
  waId: string | null
  error: string | null
  errorCode: number | null
}

export interface ParsedContactSync {
  account: WaAccountRef
  phone: string | null
  name: string | null
  action: string | null
}

export interface ParsedWebhook {
  messages: ParsedMessage[]
  statuses: ParsedStatus[]
  contactSyncs: ParsedContactSync[]
  /** Cambios que se aceptan y se ignoran (history, account_update, ...). Solo para el log. */
  ignored: { field: string; account: WaAccountRef }[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyObj = Record<string, any>

function extractText(m: AnyObj): string {
  if (m.type === 'text') return m.text?.body || ''
  // Botones y listas: lo util es lo que el cliente vio y toco.
  if (m.type === 'button') return m.button?.text || ''
  if (m.type === 'interactive') {
    return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title
      || m.interactive?.nfm_reply?.body || m.interactive?.body?.text || ''
  }
  if (m.type === 'location') {
    const l = m.location || {}
    const partes = [l.name, l.address].filter(Boolean).join(' - ')
    return partes || (l.latitude != null ? `${l.latitude}, ${l.longitude}` : '')
  }
  if (m.type === 'template') return m.template?.body?.text || m.template?.name || ''
  if (m.type === 'contacts') {
    const c = m.contacts?.[0]
    return c ? `Contacto: ${c.name?.formatted_name || ''} ${c.phones?.[0]?.phone || ''}`.trim() : 'Contacto'
  }
  // Imagenes, videos y documentos pueden traer pie de foto.
  return m[m.type]?.caption || ''
}

function extractMedia(m: AnyObj): WaMediaRef | null {
  if (!['image', 'video', 'audio', 'document', 'sticker'].includes(m.type)) return null
  const d = m[m.type] || {}
  return { mediaId: d.id || null, mimeType: d.mime_type || null, filename: d.filename || null }
}

function extractReferral(m: AnyObj): Record<string, string | null> | null {
  const r = m?.referral
  if (!r) return null
  return {
    sourceType: r.source_type || null,
    sourceId: r.source_id || null,
    headline: r.headline || null,
    body: r.body || null,
    sourceUrl: r.source_url || null,
    ctwaClid: r.ctwa_clid || null,
  }
}

function toParsedMessage(m: AnyObj, account: WaAccountRef, origin: 'in' | 'echo', contacts: Record<string, AnyObj>): ParsedMessage {
  let phone: string | null
  let bsuid: string | null
  if (origin === 'in') {
    const c = contacts[m.from] || contacts[m.from_user_id] || {}
    phone = m.from || c.phone || null
    bsuid = m.from_user_id || c.bsuid || null
  } else {
    // Eco: `from` es el numero del negocio y el cliente esta en `to`.
    const c = contacts[m.to] || contacts[m.to_user_id] || {}
    phone = m.to || c.phone || null
    bsuid = m.to_user_id || m.recipient_user_id || c.bsuid || null
  }
  if (phone && isBsuid(phone)) { bsuid = bsuid || phone; phone = null }
  const c = contacts[phone || ''] || contacts[bsuid || ''] || {}
  const rawType = String(m.type || 'unknown')
  const type: WaMessageType = KNOWN_TYPES.has(rawType as WaMessageType) ? (rawType as WaMessageType) : 'unsupported'
  return {
    account,
    origin,
    waMessageId: m.id,
    waId: phone || bsuid,
    phone,
    bsuid,
    username: c.username || null,
    name: c.name || null,
    type,
    rawType,
    timestamp: Number(m.timestamp) * 1000 || Date.now(),
    text: extractText(m),
    media: extractMedia(m),
    replyTo: m.context?.id || null,
    location: m.type === 'location'
      ? {
          latitude: m.location?.latitude ?? null,
          longitude: m.location?.longitude ?? null,
          name: m.location?.name ?? null,
          address: m.location?.address ?? null,
        }
      : null,
    reaction: m.type === 'reaction' && m.reaction?.message_id
      ? { messageId: m.reaction.message_id, emoji: m.reaction.emoji || null }
      : null,
    referral: extractReferral(m),
    raw: m,
  }
}

/**
 * Aplana el payload del webhook. Meta anida todo en entry[].changes[].value y
 * un mismo POST puede mezclar mensajes, estados y (con coexistencia) ecos,
 * historial y contactos.
 */
export function parseWhatsappWebhook(body: AnyObj): ParsedWebhook {
  const out: ParsedWebhook = { messages: [], statuses: [], contactSyncs: [], ignored: [] }

  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value
      if (!value) continue
      const field: string = change.field || 'messages'
      const account: WaAccountRef = {
        wabaId: entry.id || null,
        phoneNumberId: value.metadata?.phone_number_id || null,
        displayNumber: value.metadata?.display_phone_number || null,
      }

      // Contactos: se indexan por telefono (wa_id) Y por BSUID (user_id).
      const contacts: Record<string, AnyObj> = {}
      for (const c of value.contacts || []) {
        const d = { name: c?.profile?.name || null, phone: c?.wa_id || null, bsuid: c?.user_id || null, username: c?.username || null }
        if (d.phone) contacts[d.phone] = d
        if (d.bsuid) contacts[d.bsuid] = d
      }

      if (field === 'messages') {
        for (const m of value.messages || []) {
          if (!m?.id) continue
          out.messages.push(toParsedMessage(m, account, 'in', contacts))
        }
        for (const s of value.statuses || []) {
          if (!s?.id) continue
          out.statuses.push({
            account,
            waMessageId: s.id,
            status: s.status || null,
            timestamp: Number(s.timestamp) * 1000 || Date.now(),
            // Al contestarle a un BSUID, Meta devuelve recipient_user_id.
            waId: s.recipient_id || s.recipient_user_id || null,
            error: s.errors?.[0]?.error_data?.details || s.errors?.[0]?.title || s.errors?.[0]?.message || null,
            errorCode: s.errors?.[0]?.code ?? null,
          })
        }
        continue
      }

      if (field === 'smb_message_echoes') {
        // Coexistencia: lo que el comerciante manda desde la app WhatsApp
        // Business del celular. Se guarda como saliente (sentBy 'phone').
        for (const m of value.message_echoes || []) {
          if (!m?.id) continue
          out.messages.push(toParsedMessage(m, account, 'echo', contacts))
        }
        continue
      }

      if (field === 'smb_app_state_sync') {
        for (const s of value.state_sync || []) {
          if (s?.type !== 'contact') continue
          out.contactSyncs.push({
            account,
            phone: s.contact?.phone_number ? String(s.contact.phone_number).replace(/\D/g, '') : null,
            name: s.contact?.full_name || s.contact?.first_name || null,
            action: s.action || null,
          })
        }
        continue
      }

      // history (fase 1: no se importa), account_update,
      // message_template_status_update, etc.: se aceptan y se ignoran.
      out.ignored.push({ field, account })
    }
  }
  return out
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// =================== ENVIOS ===================

interface SendResult { waMessageId: string }

function firstMessageId(data: { messages?: { id?: string }[] }): string {
  const id = data?.messages?.[0]?.id
  if (!id) throw new MetaError('Meta acepto el envio pero no devolvio el id del mensaje')
  return id
}

export async function sendWhatsappText(p: {
  token: string; phoneNumberId: string; to: string; text: string; replyTo?: string | null
}): Promise<SendResult> {
  const data = await graphFetch<{ messages?: { id?: string }[] }>(`${p.phoneNumberId}/messages`, {
    token: p.token,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...recipientOf(p.to),
      type: 'text',
      // preview_url: los enlaces se ven con su tarjeta, como en WhatsApp normal.
      text: { preview_url: true, body: p.text },
      // context = "responder citando".
      ...(p.replyTo ? { context: { message_id: p.replyTo } } : {}),
    },
  })
  return { waMessageId: firstMessageId(data) }
}

export type OutMediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker'

/**
 * Envia un archivo referenciado por URL publica (nuestro R2). Mas simple y
 * robusto que subir el binario a Meta, y el archivo ya queda guardado.
 */
export async function sendWhatsappMedia(p: {
  token: string; phoneNumberId: string; to: string; type: OutMediaType; link: string
  caption?: string; filename?: string; replyTo?: string | null
}): Promise<SendResult> {
  const media: Record<string, string> = { link: p.link }
  // Ni el audio ni el sticker admiten pie: Meta rechaza el envio entero.
  if (p.caption && p.type !== 'audio' && p.type !== 'sticker') media.caption = p.caption
  if (p.filename && p.type === 'document') media.filename = p.filename
  const data = await graphFetch<{ messages?: { id?: string }[] }>(`${p.phoneNumberId}/messages`, {
    token: p.token,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...recipientOf(p.to),
      type: p.type,
      [p.type]: media,
      ...(p.replyTo ? { context: { message_id: p.replyTo } } : {}),
    },
  })
  return { waMessageId: firstMessageId(data) }
}

/** Envia (o quita, con emoji vacio) una reaccion. */
export async function sendWhatsappReaction(p: {
  token: string; phoneNumberId: string; to: string; messageId: string; emoji: string
}): Promise<{ waMessageId: string | null }> {
  const data = await graphFetch<{ messages?: { id?: string }[] }>(`${p.phoneNumberId}/messages`, {
    token: p.token,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...recipientOf(p.to),
      type: 'reaction',
      reaction: { message_id: p.messageId, emoji: p.emoji || '' },
    },
  })
  return { waMessageId: data?.messages?.[0]?.id || null }
}

/** Marca un entrante como leido: el cliente ve las palomitas azules. */
export async function markWhatsappMessageRead(p: { token: string; phoneNumberId: string; messageId: string }) {
  await graphFetch(`${p.phoneNumberId}/messages`, {
    token: p.token,
    body: { messaging_product: 'whatsapp', status: 'read', message_id: p.messageId },
  })
}

// =================== MEDIA ENTRANTE ===================

/**
 * Descarga un archivo recibido. Dos pasos (asi lo diseño Meta): la ficha trae
 * una URL temporal (caduca en minutos) y despues se baja de esa URL, ambas con
 * el token. El mediaId en si vale ~30 dias, asi que se puede reintentar.
 */
/**
 * Hosts desde los que Meta sirve los adjuntos (lookaside.fbsbx.com). El token
 * de la tienda solo se manda ahi: nunca a una URL cualquiera (SSRF / fuga).
 */
function isMetaMediaUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    return ['fbsbx.com', 'facebook.com', 'fbcdn.net', 'whatsapp.net'].some(d => h === d || h.endsWith(`.${d}`))
  } catch {
    return false
  }
}

export async function downloadWhatsappMedia(p: { token: string; mediaId: string; maxBytes?: number }): Promise<{ buffer: Buffer; mimeType: string }> {
  // Los ids de media de Meta son numericos. Cualquier otra cosa (una URL, una
  // ruta) se rechaza antes de mandarla a graphFetch con el token.
  if (!/^\d{1,40}$/.test(String(p.mediaId || ''))) throw new Error('mediaId invalido')
  const ficha = await graphFetch<{ url?: string; mime_type?: string; file_size?: number }>(p.mediaId, { token: p.token })
  if (!ficha.url) throw new MetaError(`Meta no entrego la ficha del archivo ${p.mediaId}`)
  if (!isMetaMediaUrl(ficha.url)) throw new Error('URL de descarga de Meta inesperada')
  const max = p.maxBytes ?? 100 * 1024 * 1024
  if (ficha.file_size && ficha.file_size > max) throw new Error(`Archivo demasiado grande (${ficha.file_size} bytes)`)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)
  try {
    const res = await fetch(ficha.url, { headers: { Authorization: `Bearer ${p.token}` }, signal: ctrl.signal })
    if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status})`)
    const declared = Number(res.headers.get('content-length') || 0)
    if (declared && declared > max) throw new Error(`Archivo demasiado grande (${declared} bytes)`)
    // Tope tambien leyendo: file_size y content-length pueden faltar.
    const chunks: Buffer[] = []
    let total = 0
    if (res.body) {
      const reader = res.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > max) {
          await reader.cancel().catch(() => {})
          throw new Error('Archivo demasiado grande')
        }
        chunks.push(Buffer.from(value))
      }
    }
    return { buffer: Buffer.concat(chunks), mimeType: ficha.mime_type || 'application/octet-stream' }
  } finally {
    clearTimeout(timer)
  }
}

/** El tipo MIME a secas: una nota de voz llega como `audio/ogg; codecs=opus`. */
export const mimeBase = (mimeType: unknown) => String(mimeType || '').split(';')[0].trim().toLowerCase()

/** Extension de archivo a partir del tipo MIME. */
export function extensionFromMime(mimeType: unknown): string {
  const mapa: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/3gpp': '3gp',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr',
    'application/pdf': 'pdf', 'text/plain': 'txt',
    'application/msword': 'doc', 'application/vnd.ms-excel': 'xls', 'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  }
  const base = mimeBase(mimeType)
  const ext = mapa[base] || base.split('/')[1] || 'bin'
  return ext.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin'
}

/**
 * Tipos y limites que acepta WhatsApp para ENVIAR (mismos que Cobrify).
 * image/webp solo como sticker: como imagen Meta lo rechaza, por eso
 * api/whatsapp.ts lo convierte a JPEG con sharp antes de enviarlo.
 */
export const MEDIA_PERMITIDOS: Record<string, { type: OutMediaType; max: number }> = {
  'image/jpeg': { type: 'image', max: 5 * 1024 * 1024 },
  'image/png': { type: 'image', max: 5 * 1024 * 1024 },
  'image/webp': { type: 'image', max: 5 * 1024 * 1024 },
  'video/mp4': { type: 'video', max: 16 * 1024 * 1024 },
  'video/3gpp': { type: 'video', max: 16 * 1024 * 1024 },
  'audio/mpeg': { type: 'audio', max: 16 * 1024 * 1024 },
  'audio/ogg': { type: 'audio', max: 16 * 1024 * 1024 },
  'audio/mp4': { type: 'audio', max: 16 * 1024 * 1024 },
  'audio/aac': { type: 'audio', max: 16 * 1024 * 1024 },
  'audio/amr': { type: 'audio', max: 16 * 1024 * 1024 },
  'application/pdf': { type: 'document', max: 100 * 1024 * 1024 },
  'text/plain': { type: 'document', max: 100 * 1024 * 1024 },
  'application/msword': { type: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.ms-excel': { type: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.ms-powerpoint': { type: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { type: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { type: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { type: 'document', max: 100 * 1024 * 1024 },
}

// =================== PLANTILLAS ===================
// Fuera de la ventana de 24 h solo se puede escribir con una plantilla
// aprobada. Viven en la WABA; se copian a waSettings/templates.

export interface WaTemplate {
  name: string
  language: string
  status: string
  category: string
  components: unknown[]
}

export async function listWhatsappTemplates(p: { token: string; wabaId: string }): Promise<WaTemplate[]> {
  const todas: Record<string, unknown>[] = []
  let url: string | null = `${GRAPH_BASE}/${p.wabaId}/message_templates?fields=name,status,category,language,components&limit=100`
  let paginas = 0
  while (url && paginas < 20) {
    const data: { data?: Record<string, unknown>[]; paging?: { next?: string } } = await graphFetch(url, { token: p.token })
    todas.push(...(data.data || []))
    url = data.paging?.next || null
    paginas++
  }
  return todas.map(t => ({
    name: String(t.name || ''),
    language: String(t.language || ''),
    status: String(t.status || ''),
    category: String(t.category || ''),
    // Estructura tal cual la manda Meta: HEADER, BODY con {{n}}, FOOTER, BUTTONS.
    components: Array.isArray(t.components) ? t.components : [],
  }))
}

interface TemplateComponent { type?: string; format?: string; text?: string }

/** Texto final de una plantilla con sus valores, para mostrarlo en la bandeja. */
export function renderTemplateText(components: unknown[], bodyValues: string[] = [], headerText: string | null = null): string {
  const partes: string[] = []
  for (const raw of components || []) {
    const c = raw as TemplateComponent
    if (c.type === 'HEADER' && c.format === 'TEXT' && c.text) {
      partes.push(headerText ? c.text.replace('{{1}}', headerText) : c.text)
    } else if (c.type === 'BODY' && c.text) {
      let t = c.text
      bodyValues.forEach((v, i) => { t = t.split(`{{${i + 1}}}`).join(v ?? '') })
      partes.push(t)
    } else if (c.type === 'FOOTER' && c.text) {
      partes.push(c.text)
    }
  }
  return partes.join('\n\n')
}

export async function sendWhatsappTemplate(p: {
  token: string; phoneNumberId: string; to: string; name: string; language: string
  bodyValues?: string[]; headerText?: string | null; headerImageUrl?: string | null
}): Promise<SendResult> {
  const components: unknown[] = []
  if (p.headerImageUrl) {
    components.push({ type: 'header', parameters: [{ type: 'image', image: { link: p.headerImageUrl } }] })
  } else if (p.headerText) {
    components.push({ type: 'header', parameters: [{ type: 'text', text: p.headerText }] })
  }
  if (p.bodyValues?.length) {
    components.push({ type: 'body', parameters: p.bodyValues.map(v => ({ type: 'text', text: String(v ?? '') })) })
  }
  const data = await graphFetch<{ messages?: { id?: string }[] }>(`${p.phoneNumberId}/messages`, {
    token: p.token,
    body: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...recipientOf(p.to),
      type: 'template',
      template: { name: p.name, language: { code: p.language || 'es' }, ...(components.length ? { components } : {}) },
    },
  })
  return { waMessageId: firstMessageId(data) }
}

/**
 * Crea una plantilla en la WABA de la tienda (POST /{waba_id}/message_templates).
 * Solo cuerpo con variables posicionales {{1}}..{{n}}: Meta exige un ejemplo
 * de cada variable (example.body_text) para revisarla. Nace PENDING; la
 * aprobacion llega por webhook o al sincronizar.
 */
export async function createWhatsappTemplate(p: {
  token: string; wabaId: string; name: string; language: string
  category: 'UTILITY' | 'MARKETING'; body: string; bodyExamples: string[]; footer?: string | null
}): Promise<{ id: string | null; status: string | null }> {
  const components: unknown[] = [{
    type: 'BODY',
    text: p.body,
    ...(p.bodyExamples.length ? { example: { body_text: [p.bodyExamples] } } : {}),
  }]
  if (p.footer) components.push({ type: 'FOOTER', text: p.footer })
  const data = await graphFetch<{ id?: string; status?: string }>(`${p.wabaId}/message_templates`, {
    token: p.token,
    body: { name: p.name, language: p.language, category: p.category, components },
  })
  return { id: data.id || null, status: data.status || null }
}

// =================== ONBOARDING (Embedded Signup) ===================

/**
 * Canjea el `code` de Embedded Signup por el token de negocio del cliente.
 * El code vive ~30 segundos: el front tiene que mandarlo apenas lo recibe.
 */
export async function exchangeCodeForToken(p: { appId: string; appSecret: string; code: string }): Promise<string> {
  const data = await graphFetch<{ access_token?: string }>('oauth/access_token', {
    query: { client_id: p.appId, client_secret: p.appSecret, code: p.code },
  })
  if (!data.access_token) throw new MetaError('Meta no devolvio el token de acceso')
  return data.access_token
}

// =================== SALUD DEL TOKEN ===================

/**
 * Lo que dice Meta de un token (GET /debug_token). `expiresAt` null = no vence
 * (Meta devuelve expires_at 0: token de system user "permanente", como el que se
 * pega a mano en connect-manual).
 */
export interface WaTokenInfo {
  isValid: boolean
  expiresAt: Date | null
  /** 'SYSTEM_USER', 'USER', 'PAGE'… (tal cual lo manda Meta). */
  type: string | null
  /** Codigo de error de Meta si el token no es valido (190 = vencido/revocado). */
  errorCode: number | null
  errorMessage: string | null
}

/**
 * Inspecciona un token con el app access token (APP_ID|APP_SECRET), que es lo
 * que pide /debug_token. input_token tiene que ir como parametro: es una
 * llamada servidor a servidor, igual que el canje del code.
 * https://developers.facebook.com/docs/graph-api/reference/debug_token/
 */
export async function debugWhatsappToken(p: { appId: string; appSecret: string; token: string }): Promise<WaTokenInfo> {
  const data = await graphFetch<{ data?: {
    is_valid?: boolean; expires_at?: number; type?: string
    error?: { code?: number; message?: string }
  } }>('debug_token', {
    token: `${p.appId}|${p.appSecret}`,
    query: { input_token: p.token },
  })
  const d = data.data || {}
  const exp = Number(d.expires_at || 0)
  return {
    isValid: d.is_valid === true,
    expiresAt: exp > 0 ? new Date(exp * 1000) : null,
    type: d.type || null,
    errorCode: d.error?.code ?? null,
    errorMessage: d.error?.message ?? null,
  }
}

/**
 * Renueva un token de system user que vence (los de Embedded Signup de una
 * configuracion con vencimiento a 60 dias): devuelve uno nuevo valido por otros
 * 60 dias. Solo funciona mientras el token actual siga vigente.
 * https://developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens
 *   GET /oauth/access_token?grant_type=fb_exchange_token&client_id&client_secret
 *       &set_token_expires_in_60_days=true&fb_exchange_token={token}
 * OJO: NO llamarlo con un token que no vence: lo convertiria en uno de 60 dias.
 */
export async function refreshWhatsappToken(p: { appId: string; appSecret: string; token: string }): Promise<{ token: string; expiresIn: number | null }> {
  const data = await graphFetch<{ access_token?: string; expires_in?: number }>('oauth/access_token', {
    query: {
      grant_type: 'fb_exchange_token',
      client_id: p.appId,
      client_secret: p.appSecret,
      set_token_expires_in_60_days: 'true',
      fb_exchange_token: p.token,
    },
  })
  if (!data.access_token) throw new MetaError('Meta no devolvio el token renovado')
  const expiresIn = Number(data.expires_in || 0)
  return { token: data.access_token, expiresIn: expiresIn > 0 ? expiresIn : null }
}

/** 190 = token invalido (vencido, revocado o de una sesion cerrada). */
export const isTokenInvalidError = (e: unknown) => e instanceof MetaError && e.metaCode === 190

export interface WaPhoneInfo {
  id: string
  display_phone_number?: string
  verified_name?: string
}

/** Numeros de la WABA (sirve para validar que el phoneNumberId es de esta cuenta). */
export async function listWabaPhoneNumbers(p: { token: string; wabaId: string }): Promise<WaPhoneInfo[]> {
  const data = await graphFetch<{ data?: WaPhoneInfo[] }>(`${p.wabaId}/phone_numbers`, {
    token: p.token,
    query: { fields: 'id,display_phone_number,verified_name' },
  })
  return data.data || []
}

/** Suscribe nuestra app a los webhooks de la WABA del cliente. */
export async function subscribeAppToWaba(p: { token: string; wabaId: string }) {
  await graphFetch(`${p.wabaId}/subscribed_apps`, { token: p.token, method: 'POST' })
}

/**
 * Des-suscribe la app de la WABA: Meta deja de mandar webhooks de esa cuenta.
 * Se usa al desconectar y al eliminar la cuenta (best effort: quien llama
 * decide si ignora el error).
 */
export async function unsubscribeAppFromWaba(p: { token: string; wabaId: string }) {
  await graphFetch(`${p.wabaId}/subscribed_apps`, { token: p.token, method: 'DELETE' })
}

/**
 * Registra el numero en la Cloud API con un PIN de 6 digitos (verificacion en
 * dos pasos). NO se llama en coexistencia: ese numero ya esta registrado en la
 * app WhatsApp Business y registrarlo lo romperia.
 */
export async function registerPhoneNumber(p: { token: string; phoneNumberId: string; pin: string }) {
  await graphFetch(`${p.phoneNumberId}/register`, {
    token: p.token,
    body: { messaging_product: 'whatsapp', pin: p.pin },
  })
}

/**
 * Coexistencia: pide a Meta que mande por webhook los contactos
 * (smb_app_state_sync) o el historial (history) de la app. Solo se puede
 * dentro de las 24 h posteriores al onboarding.
 */
export async function requestSmbAppDataSync(p: { token: string; phoneNumberId: string; syncType: 'smb_app_state_sync' | 'history' }) {
  await graphFetch(`${p.phoneNumberId}/smb_app_data`, {
    token: p.token,
    body: { messaging_product: 'whatsapp', sync_type: p.syncType },
  })
}

// =================== BAJA VOLUNTARIA ===================

/**
 * Si el cliente pide que no le escriban mas, se respeta. Se detecta con
 * frases tipicas (mismas que Cobrify).
 */
export function looksLikeOptOut(texto: unknown): boolean {
  const t = String(texto || '').trim().toLowerCase()
  if (!t || t.length > 80) return false
  return /^(no enviar|no me envi|no quiero recibir|no mas mensajes|no m[aá]s mensajes|baja|stop|cancelar suscripci|dar de baja|darme de baja|dejen de escribir|no me escriban|no molestar|unsubscribe)/.test(t)
}
