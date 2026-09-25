/**
 * ShopiChat — lectura en vivo (Firestore) y llamadas a la API de WhatsApp.
 * =======================================================================
 * Portado del servicio de la bandeja de Cobrify (whatsappChatService.js),
 * adaptado al contrato de Shopifree: todo cuelga de `stores/{storeId}` y las
 * acciones van por un único endpoint, POST /api/whatsapp { action, storeId }.
 *
 * Los mensajes los escribe el servidor (el webhook y la API de envío), así que
 * acá solo se ESCUCHA. Firestore empuja los cambios solo: cuando entra un
 * mensaje aparece en pantalla sin refrescar.
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { apiUrl } from '../utils/apiBase'
import type {
  WaAccount,
  WaApiAction,
  WaAutomations,
  WaConversation,
  WaConversationStatus,
  WaMessage,
  WaTemplate,
  WaTemplatesDoc,
} from '../types/shopichat'

// ============================================================================
// Constantes
// ============================================================================

/** Milisegundos que dura la ventana de servicio de WhatsApp. */
export const WINDOW_24H_MS = 24 * 60 * 60 * 1000

/**
 * Cuántas conversaciones trae la bandeja. En Cobrify 200 se quedó corto con
 * una campaña; una tienda chica rara vez pasa de unos cientos. Si algún día se
 * pasa, tocará "cargar más" y búsqueda en el servidor.
 */
export const MAX_CONVERSATIONS = 500

/** Cuántos mensajes se traen de una conversación al abrirla. */
export const MESSAGES_WINDOW = 150

/**
 * Tope para mandar un archivo en base64 por el body de la API: Vercel corta
 * en ~4,5 MB y el base64 infla ~1,37×. Por encima de esto el archivo se sube
 * DIRECTO a R2 con una URL prefirmada ('upload-url') y se manda por URL.
 */
export const MAX_BASE64_BYTES = 3 * 1024 * 1024

// ============================================================================
// Referencias
// ============================================================================

const conversationsCol = (storeId: string) => collection(db, 'stores', storeId, 'waConversations')
const conversationRef = (storeId: string, waId: string) => doc(db, 'stores', storeId, 'waConversations', waId)
const messagesCol = (storeId: string, waId: string) =>
  collection(db, 'stores', storeId, 'waConversations', waId, 'messages')
const settingsRef = (storeId: string, id: 'account' | 'templates' | 'automations') =>
  doc(db, 'stores', storeId, 'waSettings', id)

// ============================================================================
// Suscripciones
// ============================================================================

/**
 * La lista de conversaciones, la más reciente primero.
 *
 * Ojo: el panel (DashboardLayout, para el contador y el sonido) y la bandeja
 * piden EXACTAMENTE esta misma consulta. Firestore comparte el listener de dos
 * consultas idénticas, así que tenerla abierta dos veces no duplica lecturas.
 */
export function subscribeConversations(
  storeId: string,
  onChange: (list: WaConversation[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(conversationsCol(storeId), orderBy('lastMessageAt', 'desc'), limit(MAX_CONVERSATIONS))
  return onSnapshot(
    q,
    snap => onChange(snap.docs.map(d => ({ id: d.id, waId: d.id, ...d.data() }) as WaConversation)),
    error => {
      console.warn('[shopichat] conversaciones:', error.message)
      onError?.(error)
    }
  )
}

/**
 * Los mensajes de una conversación, del más viejo al más nuevo.
 *
 * `limitToLast` y no `limit`: con orden ascendente, `limit` se queda con los
 * MÁS VIEJOS y el chat se clava en historia antigua pasados los 150.
 */
export function subscribeMessages(
  storeId: string,
  waId: string,
  onChange: (list: WaMessage[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const q = query(messagesCol(storeId, waId), orderBy('timestamp', 'asc'), limitToLast(MESSAGES_WINDOW))
  return onSnapshot(
    q,
    snap => onChange(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WaMessage)),
    error => {
      console.warn('[shopichat] mensajes:', error.message)
      onError?.(error)
    }
  )
}

/**
 * Trae el hilo una vez para dejarlo en la caché local de Firestore: la
 * suscripción que venga después arranca desde ahí sin esperar a la red. Se
 * llama al posar el mouse sobre una conversación.
 */
export function prefetchMessages(storeId: string, waId: string): Promise<void> {
  return getDocs(query(messagesCol(storeId, waId), orderBy('timestamp', 'asc'), limitToLast(MESSAGES_WINDOW)))
    .then(() => undefined)
    .catch(() => undefined)
}

/** El documento de la cuenta conectada. `null` = todavía no existe. */
export function subscribeAccount(
  storeId: string,
  onChange: (account: WaAccount | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return onSnapshot(
    settingsRef(storeId, 'account'),
    snap => onChange(snap.exists() ? (snap.data() as WaAccount) : null),
    error => {
      console.warn('[shopichat] cuenta:', error.message)
      onError?.(error)
    }
  )
}

export function subscribeTemplates(
  storeId: string,
  onChange: (doc: WaTemplatesDoc) => void
): Unsubscribe {
  return onSnapshot(
    settingsRef(storeId, 'templates'),
    snap => {
      const data = snap.exists() ? (snap.data() as Partial<WaTemplatesDoc>) : {}
      onChange({ items: data.items || [], syncedAt: data.syncedAt || null })
    },
    error => console.warn('[shopichat] plantillas:', error.message)
  )
}

export function subscribeAutomations(
  storeId: string,
  onChange: (doc: WaAutomations) => void
): Unsubscribe {
  return onSnapshot(
    settingsRef(storeId, 'automations'),
    snap => {
      const data = snap.exists() ? (snap.data() as Partial<WaAutomations>) : {}
      onChange({ quickReplies: Array.isArray(data.quickReplies) ? data.quickReplies : [] })
    },
    error => console.warn('[shopichat] automatizaciones:', error.message)
  )
}

/**
 * Cuántas conversaciones tienen algo sin leer. Consulta aparte y chica (solo
 * las que tienen `unread > 0`) para el contador del menú: no hace falta bajar
 * la bandeja entera para pintar un número.
 */
export function subscribeUnreadCount(storeId: string, onChange: (n: number) => void): Unsubscribe {
  const q = query(conversationsCol(storeId), where('unread', '>', 0), limit(100))
  return onSnapshot(
    q,
    snap => onChange(snap.size),
    () => onChange(0)
  )
}

// ============================================================================
// Escrituras permitidas al cliente (status, labels, note, unread→0)
// ============================================================================
// Las reglas de Firestore solo dejan tocar ESOS cuatro campos (ni siquiera
// updatedAt), así que acá no se agrega nada más. `note` tiene que ser string
// (vacía para borrarla, no null) y `labels` hasta 20.

export const MAX_LABELS = 20

export function setConversationStatus(storeId: string, waId: string, status: WaConversationStatus) {
  return updateDoc(conversationRef(storeId, waId), { status })
}

export function setConversationLabels(storeId: string, waId: string, labels: string[]) {
  return updateDoc(conversationRef(storeId, waId), { labels: labels.slice(0, MAX_LABELS) })
}

export function setConversationNote(storeId: string, waId: string, note: string) {
  return updateDoc(conversationRef(storeId, waId), { note: (note || '').slice(0, 2000) })
}

/** Limpia el contador local. Falla en silencio: el contador también se limpia al responder. */
export async function clearUnread(storeId: string, waId: string) {
  try {
    await updateDoc(conversationRef(storeId, waId), { unread: 0 })
  } catch (error) {
    console.warn('[shopichat] no se pudo marcar como leída:', error)
  }
}

export function saveQuickReplies(storeId: string, quickReplies: WaAutomations['quickReplies']) {
  return setDoc(settingsRef(storeId, 'automations'), { quickReplies, updatedAt: serverTimestamp() }, { merge: true })
}

// ============================================================================
// API
// ============================================================================

/** Error de la API que conserva el código (`WINDOW_CLOSED`, `PLAN_REQUIRED`, ...). */
export class ShopiChatApiError extends Error {
  code?: string
  status: number
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ShopiChatApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Llama a POST /api/whatsapp con el token de Firebase. Devuelve el JSON de la
 * respuesta o lanza ShopiChatApiError.
 */
export async function callWhatsappApi<T = Record<string, unknown>>(
  action: WaApiAction,
  storeId: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new ShopiChatApiError('No hay sesión', 401, 'UNAUTHENTICATED')
  let res: Response
  try {
    res = await fetch(apiUrl('/api/whatsapp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, storeId, ...payload }),
    })
  } catch {
    throw new ShopiChatApiError('Sin conexión', 0, 'NETWORK')
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const code = typeof data.error === 'string' ? data.error : undefined
    const message = typeof data.message === 'string' ? data.message : code || `HTTP ${res.status}`
    throw new ShopiChatApiError(message, res.status, code)
  }
  return data as T
}

/** El wamid que devuelve la API al mandar, venga con el nombre que venga. */
export function sentMessageId(data: Record<string, unknown>): string | undefined {
  const v = data.messageId ?? data.wamid ?? data.id
  return typeof v === 'string' ? v : undefined
}

export const sendText = (storeId: string, waId: string, text: string, replyTo?: string | null) =>
  callWhatsappApi('send-text', storeId, { waId, text, ...(replyTo ? { replyTo } : {}) })

export interface SendMediaInput {
  mediaBase64?: string
  mediaUrl?: string
  mimeType: string
  filename?: string
  caption?: string
  replyTo?: string | null
  /** Un webp reenviado como sticker (como imagen Meta lo rechaza). */
  asSticker?: boolean
}

export const sendMedia = (storeId: string, waId: string, input: SendMediaInput) =>
  callWhatsappApi('send-media', storeId, { waId, ...input, replyTo: input.replyTo || undefined })

/** Avisa a WhatsApp que leímos (dos palomitas azules al cliente). Silencioso. */
export async function markRead(storeId: string, waId: string) {
  try {
    await callWhatsappApi('mark-read', storeId, { waId })
  } catch (e) {
    console.warn('[shopichat] mark-read:', (e as Error).message)
  }
}

/**
 * Vuelve a bajar a R2 un adjunto entrante que no se archivó (el mediaId de
 * Meta vale ~30 días). La burbuja se actualiza sola por la suscripción.
 */
export const retryMedia = (storeId: string, waId: string, messageId: string) =>
  callWhatsappApi('retry-media', storeId, { waId, messageId })

/**
 * Sube un archivo grande DIRECTO a R2 (sin pasar por el body de Vercel): la
 * API da una URL PUT prefirmada con el tipo y el tamaño exactos, el navegador
 * sube y devuelve la URL pública para `send-media` ({ mediaUrl }).
 */
export async function uploadLargeMedia(storeId: string, file: Blob, mimeType: string): Promise<string> {
  const data = await callWhatsappApi<{ uploadUrl?: string; mediaUrl?: string; headers?: Record<string, string> }>(
    'upload-url', storeId, { mimeType, size: file.size }
  )
  if (!data.uploadUrl || !data.mediaUrl) throw new ShopiChatApiError('Sin URL de subida', 500, 'UPLOAD_FAILED')
  let res: Response
  try {
    res = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType, ...(data.headers || {}) },
      body: file,
    })
  } catch {
    // Sin red, o el bucket sin CORS para este origen.
    throw new ShopiChatApiError('No se pudo subir el archivo', 0, 'UPLOAD_FAILED')
  }
  if (!res.ok) throw new ShopiChatApiError(`No se pudo subir el archivo (HTTP ${res.status})`, res.status, 'UPLOAD_FAILED')
  return data.mediaUrl
}

/** Un emoji vacío QUITA la reacción: así lo entiende Meta. */
export const react = (storeId: string, waId: string, messageId: string, emoji: string) =>
  callWhatsappApi('react', storeId, { waId, messageId, emoji })

export const syncTemplates = (storeId: string) =>
  callWhatsappApi<{ total?: number; count?: number }>('sync-templates', storeId)

export interface TemplateValues {
  body: string[]
  headerText?: string | null
  headerImageUrl?: string | null
}

export const sendTemplate = (storeId: string, waId: string, template: WaTemplate, values: TemplateValues) =>
  callWhatsappApi('send-template', storeId, {
    waId,
    name: template.name,
    language: template.language,
    params: {
      body: values.body,
      ...(values.headerText ? { header: values.headerText } : {}),
      ...(values.headerImageUrl ? { headerImageUrl: values.headerImageUrl } : {}),
    },
  })

export const connectAccount = (
  storeId: string,
  input: { code: string; wabaId: string; phoneNumberId?: string; coexistence?: boolean }
) => callWhatsappApi('connect', storeId, input)

export const disconnectAccount = (storeId: string) => callWhatsappApi('disconnect', storeId)

// ============================================================================
// Archivos
// ============================================================================

export type MediaKind = 'image' | 'video' | 'audio' | 'document'

/**
 * Tipos que WhatsApp acepta MANDAR, con el tope de cada uno (5 MB imagen,
 * 16 MB video y audio, 100 MB documento). WebP NO está: Meta solo lo acepta
 * como sticker, así que las fotos se reencodan a JPEG antes de mandar.
 */
export const MEDIA_TYPES: Record<string, { kind: MediaKind; max: number }> = {
  'image/jpeg': { kind: 'image', max: 5 * 1024 * 1024 },
  'image/png': { kind: 'image', max: 5 * 1024 * 1024 },
  'video/mp4': { kind: 'video', max: 16 * 1024 * 1024 },
  'video/3gpp': { kind: 'video', max: 16 * 1024 * 1024 },
  'audio/mpeg': { kind: 'audio', max: 16 * 1024 * 1024 },
  'audio/ogg': { kind: 'audio', max: 16 * 1024 * 1024 },
  'audio/mp4': { kind: 'audio', max: 16 * 1024 * 1024 },
  'audio/aac': { kind: 'audio', max: 16 * 1024 * 1024 },
  'audio/amr': { kind: 'audio', max: 16 * 1024 * 1024 },
  'application/pdf': { kind: 'document', max: 100 * 1024 * 1024 },
  'text/plain': { kind: 'document', max: 100 * 1024 * 1024 },
  'application/msword': { kind: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.ms-excel': { kind: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.ms-powerpoint': { kind: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { kind: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { kind: 'document', max: 100 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { kind: 'document', max: 100 * 1024 * 1024 },
}

/** Para el `accept` del selector: también fotos webp/heic, que se convierten a JPEG. */
export const ACCEPTED_FILES = [...Object.keys(MEDIA_TYPES), 'image/webp', 'image/heic', 'image/heif'].join(',')

const baseMime = (mime?: string) => String(mime || '').split(';')[0].trim().toLowerCase()

/** Si WhatsApp acepta MANDAR este tipo (para ofrecer "Reenviar"). */
export function canSendMime(mime?: string): boolean {
  if (!mime) return true
  const m = baseMime(mime)
  return Boolean(MEDIA_TYPES[m]) || m === 'image/webp'
}

export function mediaKindOf(mime: string): MediaKind | null {
  const m = baseMime(mime)
  if (MEDIA_TYPES[m]) return MEDIA_TYPES[m].kind
  if (m.startsWith('image/')) return 'image'
  return null
}

/** null si sirve; si no, la clave i18n del motivo y sus parámetros. */
export function validateFile(file: File): { key: string; params?: Record<string, unknown> } | null {
  const m = baseMime(file.type)
  const isConvertibleImage = m.startsWith('image/') && m !== 'image/gif' && m !== 'image/svg+xml'
  const t = MEDIA_TYPES[m]
  if (!t && !isConvertibleImage) return { key: 'shopichat.errors.fileType' }
  // Las fotos se comprimen antes de mandar, así que su tamaño no importa acá.
  if (isConvertibleImage) return null
  if (t && file.size > t.max) return { key: 'shopichat.errors.fileTooBigWa', params: { mb: Math.round(t.max / 1024 / 1024) } }
  // Lo que pasa de MAX_BASE64_BYTES se sube directo a R2 (uploadLargeMedia).
  return null
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const r = String(reader.result || '')
      const c = r.indexOf(',')
      resolve(c >= 0 ? r.slice(c + 1) : r)
    }
    reader.onerror = () => reject(new Error('read'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Reduce una foto a JPEG (lado largo ≤ 1600 px, q 0,82). WhatsApp no acepta
 * WebP como imagen, y la foto del celular (3–6 MB) no entra por el body de la
 * API. Una foto así queda en ~200–400 KB. Si algo falla, devuelve el original
 * cuando ya es JPEG/PNG chico, o lanza.
 */
export async function imageToJpeg(file: Blob, maxSide = 1600, quality = 0.82): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('decode'))
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    // Fondo blanco: un PNG con transparencia saldría negro en JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality))
    if (!blob) throw new Error('encode')
    const original = (file as File).name || 'foto'
    return new File([blob], original.replace(/\.[^./\\]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch (e) {
    const m = baseMime(file.type)
    if ((m === 'image/jpeg' || m === 'image/png') && file.size <= MAX_BASE64_BYTES) {
      return file instanceof File ? file : new File([file], 'foto.jpg', { type: m })
    }
    throw e
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface PreparedMedia {
  mimeType: string
  filename: string
  kind: MediaKind
  /** Chico (≤ MAX_BASE64_BYTES): va en el body de send-media. */
  mediaBase64?: string
  /** Grande: se sube a R2 con uploadLargeMedia y se manda por URL. */
  file?: File
  /** URL en R2 una vez subido (un reintento no vuelve a subir). */
  mediaUrl?: string
}

/**
 * Deja un archivo listo para `send-media`: fotos a JPEG; lo chico en base64 y
 * lo grande (audio, video, documentos de más de ~3 MB) para subir directo.
 */
export async function prepareMedia(file: File): Promise<PreparedMedia> {
  let f = file
  if (baseMime(file.type).startsWith('image/')) f = await imageToJpeg(file)
  const mimeType = baseMime(f.type)
  const kind = mediaKindOf(mimeType) || 'document'
  if (f.size > MAX_BASE64_BYTES) return { file: f, mimeType, filename: f.name, kind }
  return { mediaBase64: await blobToBase64(f), mimeType, filename: f.name, kind }
}

/** Manda un archivo preparado: base64 directo, o subida a R2 + URL. */
export async function sendPreparedMedia(
  storeId: string,
  waId: string,
  prepared: PreparedMedia,
  extra: { caption?: string; replyTo?: string | null } = {}
) {
  if (!prepared.mediaBase64 && !prepared.mediaUrl) {
    prepared.mediaUrl = await uploadLargeMedia(storeId, prepared.file as Blob, prepared.mimeType)
  }
  const source = prepared.mediaBase64 ? { mediaBase64: prepared.mediaBase64 } : { mediaUrl: prepared.mediaUrl }
  return sendMedia(storeId, waId, {
    ...source,
    mimeType: prepared.mimeType,
    filename: prepared.filename,
    caption: extra.caption,
    replyTo: extra.replyTo,
  })
}

// ============================================================================
// Plantillas
// ============================================================================

/** Cuántos {{n}} pide el cuerpo de una plantilla. */
export function templateBodyVars(t: WaTemplate): number {
  const body = (t.components || []).find(c => c.type === 'BODY')
  const nums = [...String(body?.text || '').matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]))
  return nums.length ? Math.max(...nums) : 0
}

export function templateHeader(t: WaTemplate): { format: string; hasVar: boolean; text: string | null } | null {
  const h = (t.components || []).find(c => c.type === 'HEADER')
  if (!h) return null
  return { format: String(h.format || ''), hasVar: h.format === 'TEXT' && /\{\{1\}\}/.test(h.text || ''), text: h.text || null }
}

/** Texto final con los valores puestos, para la vista previa. */
export function previewTemplate(t: WaTemplate, values: TemplateValues): string {
  const parts: string[] = []
  for (const c of t.components || []) {
    if (c.type === 'HEADER' && c.format === 'TEXT' && c.text) {
      parts.push(values.headerText ? c.text.replace('{{1}}', values.headerText) : c.text)
    } else if (c.type === 'BODY' && c.text) {
      let txt = c.text
      values.body.forEach((v, i) => { txt = txt.split(`{{${i + 1}}}`).join(v || `{{${i + 1}}}`) })
      parts.push(txt)
    } else if (c.type === 'FOOTER' && c.text) {
      parts.push(c.text)
    }
  }
  return parts.join('\n\n')
}

// ============================================================================
// Formato
// ============================================================================

type TimeLike = { toDate?: () => Date; toMillis?: () => number } | Date | number | null | undefined

export function toDate(t: TimeLike): Date | null {
  if (!t) return null
  if (t instanceof Date) return t
  if (typeof t === 'number') return new Date(t)
  if (typeof t.toDate === 'function') return t.toDate()
  if (typeof t.toMillis === 'function') return new Date(t.toMillis())
  return null
}

export const toMillis = (t: TimeLike) => toDate(t)?.getTime() || 0

/** Milisegundos que le quedan a la ventana de 24 h (0 = cerrada). */
export function windowRemainingMs(c: Pick<WaConversation, 'windowExpiresAt'> | null | undefined, now: number): number {
  const end = toMillis(c?.windowExpiresAt)
  return end ? Math.max(0, end - now) : 0
}

/** Solo dígitos: "+51 987-654-321" → "51987654321". */
export const onlyDigits = (s?: string | null) => String(s || '').replace(/\D/g, '')

/**
 * ¿Es el mismo teléfono? Se comparan los últimos 9–10 dígitos para tolerar que
 * uno venga con código de país y el otro no (987654321 vs 51987654321).
 */
export function samePhone(a?: string | null, b?: string | null): boolean {
  const da = onlyDigits(a)
  const db2 = onlyDigits(b)
  if (!da || !db2) return false
  if (da === db2) return true
  const tail = Math.min(10, da.length, db2.length)
  // Con menos de 9 dígitos no hay forma segura de decir que es el mismo.
  if (tail < 9) return false
  return da.slice(-tail) === db2.slice(-tail)
}

/** El número legible: +51 987 654 321 (agrupado de a tres desde el final). */
export function formatPhone(waId?: string | null): string {
  if (!waId) return ''
  const n = String(waId)
  // Quien usa nombre de usuario puede escribir sin mostrar su número.
  if (/^[A-Z]{2}\./.test(n)) return '•••'
  const digits = onlyDigits(n)
  if (digits.length < 8) return `+${digits}`
  const local = digits.length > 9 ? digits.slice(-9) : digits
  const cc = digits.length > 9 ? digits.slice(0, digits.length - 9) : ''
  const grouped = local.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  return cc ? `+${cc} ${grouped}` : grouped
}

/** Hora de un mensaje. */
export function formatTime(t: TimeLike, locale: string): string {
  const d = toDate(t)
  if (!d) return ''
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/** Clave de día, para cortar el hilo sin comparar textos. */
export function dayKey(t: TimeLike): string {
  const d = toDate(t)
  if (!d) return ''
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** "3 h 20 min" — cuánto queda para responder gratis. */
export function formatRemaining(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}
