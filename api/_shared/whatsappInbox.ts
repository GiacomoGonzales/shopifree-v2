/**
 * ShopiChat — la bandeja: Firestore, R2, miniaturas y avisos push.
 *
 * Lo usan el webhook (api/whatsapp-webhook.ts) y las acciones del comerciante
 * (api/whatsapp.ts). Portado del pipeline de Cobrify (guardarMensajeEntrante,
 * actualizarEstadoMensaje, archivarMediaDeWhatsapp, avisarMensajeNuevoWa),
 * adaptado a multi-tienda:
 *
 *   stores/{storeId}/private/whatsapp            token + ids (solo servidor)
 *   waNumbers/{phoneNumberId}                    → { storeId, wabaId } (solo servidor)
 *   stores/{storeId}/waSettings/{account|templates|automations}
 *   stores/{storeId}/waConversations/{waId}
 *   stores/{storeId}/waConversations/{waId}/messages/{wamid}
 *   waUnprocessed/{id}                           lo que no se pudo guardar (solo servidor)
 */

import crypto from 'crypto'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import {
  WINDOW_24H_MS, downloadWhatsappMedia, isBsuid, isValidWaId, isSafeDocId, extensionFromMime, looksLikeOptOut, mimeBase,
  type ParsedMessage, type ParsedStatus, type ParsedContactSync, type WaMediaRef,
} from './whatsappGraph.js'

// =================== FIREBASE ===================

let _db: Firestore | null = null
export function getDb(): Firestore {
  if (_db) return _db
  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  }
  _db = getFirestore()
  return _db
}

// =================== waitUntil ===================

/**
 * waitUntil de Vercel sin agregar @vercel/functions: es exactamente lo que ese
 * paquete lee (el request context que inyecta el runtime). Si no esta (local,
 * otro runtime), devuelve null y se espera con presupuesto.
 */
export function getWaitUntil(): ((p: Promise<unknown>) => void) | null {
  try {
    const ctx = (globalThis as unknown as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[
      Symbol.for('@vercel/request-context')
    ]?.get?.()
    return typeof ctx?.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : null
  } catch {
    return null
  }
}

// =================== REFERENCIAS ===================

export const storeRef = (storeId: string) => getDb().collection('stores').doc(storeId)
export const privateWaRef = (storeId: string) => storeRef(storeId).collection('private').doc('whatsapp')
export const waSettingsRef = (storeId: string, doc: 'account' | 'templates' | 'automations') =>
  storeRef(storeId).collection('waSettings').doc(doc)
export const convRef = (storeId: string, waId: string) => storeRef(storeId).collection('waConversations').doc(waId)
export const waNumberRef = (phoneNumberId: string) => getDb().collection('waNumbers').doc(phoneNumberId)

/** Lo que guarda stores/{storeId}/private/whatsapp. NUNCA se devuelve al cliente. */
export interface PrivateWa {
  accessToken: string
  wabaId: string
  phoneNumberId: string
  displayNumber: string | null
  verifiedName: string | null
  coexistence: boolean
  connectedAt: Timestamp
  pin?: string | null
}

export async function getPrivateWa(storeId: string): Promise<PrivateWa | null> {
  const snap = await privateWaRef(storeId).get()
  if (!snap.exists) return null
  const d = snap.data() as PrivateWa
  return d?.accessToken && d?.phoneNumberId ? d : null
}

// =================== R2 ===================

let _r2: S3Client | null = null
function getR2(): S3Client {
  if (_r2) return _r2
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 no configurado (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)')
  }
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _r2
}

/**
 * Cliente aparte para prefirmar: sin checksums automaticos (el SDK agregaria
 * x-amz-checksum-crc32 de un cuerpo vacio a la URL y la subida real fallaria).
 */
let _r2Presigner: S3Client | null = null
function getR2Presigner(): S3Client {
  if (_r2Presigner) return _r2Presigner
  getR2() // valida el entorno
  _r2Presigner = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return _r2Presigner
}

export function r2PublicBase(): string {
  return (process.env.R2_PUBLIC_URL || 'https://shopifreemedia.site').replace(/\/$/, '')
}

export async function putObjectToR2(p: { key: string; body: Buffer; contentType: string }): Promise<{ url: string; key: string }> {
  const bucket = process.env.R2_BUCKET || 'shopifree-media'
  await getR2().send(new PutObjectCommand({
    Bucket: bucket,
    Key: p.key,
    Body: p.body,
    ContentType: p.contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return { url: `${r2PublicBase()}/${p.key}`, key: p.key }
}

/** Segmento seguro para una key de R2 (los BSUID traen punto, se conserva). */
const keySeg = (s: string) => String(s).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)

export const mediaKeyBase = (storeId: string, waId: string, name: string) =>
  `whatsapp/${keySeg(storeId)}/${keySeg(waId)}/${keySeg(name)}`

/** Prefijo de R2 de TODO lo de WhatsApp de una tienda (entrantes, salientes y subidas directas). */
export const storeMediaPrefix = (storeId: string) => `whatsapp/${keySeg(storeId)}/`

/** Key para una subida directa del navegador (URL prefirmada de api/whatsapp 'upload-url'). */
export const outgoingUploadKey = (storeId: string, ext: string) =>
  `${storeMediaPrefix(storeId)}outgoing/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${keySeg(ext)}`

/**
 * URL prefirmada (PUT) para que el navegador suba un archivo grande DIRECTO a
 * R2, sin pasar por el body de Vercel (~4.5 MB). Se firman content-type y
 * content-length: R2 rechaza la subida si el navegador manda otro tipo u otro
 * tamaño que el declarado (y ya validado contra los topes de WhatsApp).
 *
 * Requiere CORS en el bucket (PUT desde shopifree.app con Content-Type).
 */
export async function presignR2Put(p: { key: string; contentType: string; contentLength: number; expiresIn?: number }): Promise<string> {
  const bucket = process.env.R2_BUCKET || 'shopifree-media'
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  return getSignedUrl(getR2Presigner(), new PutObjectCommand({
    Bucket: bucket,
    Key: p.key,
    ContentType: p.contentType,
    ContentLength: p.contentLength,
  }), {
    expiresIn: p.expiresIn ?? 600,
    signableHeaders: new Set(['content-type', 'content-length']),
  })
}

// =================== MINIATURAS (sharp) ===================

// sharp ya esta en las dependencias del repo (scripts de thumbnails) y corre en
// Vercel (lambda linux-x64). Se importa dinamico: si por lo que sea no carga,
// la bandeja sigue sin miniaturas en vez de caerse.
type SharpFn = typeof import('sharp')
let _sharp: SharpFn | null | undefined
async function loadSharp(): Promise<SharpFn | null> {
  if (_sharp !== undefined) return _sharp
  try {
    _sharp = ((await import('sharp')) as unknown as { default: SharpFn }).default
  } catch (e) {
    console.warn('[whatsapp] sharp no disponible, sin miniaturas:', (e as Error).message)
    _sharp = null
  }
  return _sharp
}

/**
 * Miniatura de 600 px en JPEG, como hace WhatsApp. La burbuja no carga el
 * original (3-5 MB de camara). Devuelve tambien ancho/alto para que la UI
 * reserve el espacio y la conversacion no salte. null si falla: nunca vale la
 * pena perder un mensaje por una miniatura.
 */
export async function makeThumbnail(p: { buffer: Buffer; key: string }): Promise<{ thumbUrl: string; width?: number; height?: number } | null> {
  try {
    const sharp = await loadSharp()
    if (!sharp) return null
    const img = sharp(p.buffer, { failOn: 'none' })
    const meta = await img.metadata()
    const mini = await img
      .rotate() // respeta el EXIF: las fotos de celular vienen giradas
      .resize({ width: 600, withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer()
    const { url } = await putObjectToR2({ key: p.key, body: mini, contentType: 'image/jpeg' })
    const vertical = (meta.orientation || 0) >= 5
    return {
      thumbUrl: url,
      ...(meta.width && meta.height
        ? { width: vertical ? meta.height : meta.width, height: vertical ? meta.width : meta.height }
        : {}),
    }
  } catch (e) {
    console.warn('[whatsapp] No se pudo generar la miniatura:', (e as Error).message)
    return null
  }
}

/** WhatsApp no acepta webp como imagen (solo como sticker): se pasa a JPEG. */
export async function webpToJpeg(buffer: Buffer): Promise<Buffer | null> {
  try {
    const sharp = await loadSharp()
    if (!sharp) return null
    return await sharp(buffer, { failOn: 'none' }).rotate().jpeg({ quality: 85, mozjpeg: true }).toBuffer()
  } catch {
    return null
  }
}

// =================== IMAGEN DE PRODUCTO ===================

/**
 * Baja una imagen de producto (ya validada: ver productImageUrl en api/whatsapp.ts
 * o productCardImage en shopichatAutopilot.ts) para
 * re-subirla bajo whatsapp/{storeId}/: WhatsApp no acepta webp como imagen y
 * asi el mensaje queda archivado junto al resto del chat. null si no es una
 * imagen utilizable o pasa el tope de WhatsApp.
 */
export async function fetchProductImage(url: string, max: number): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'error' })
    if (!r.ok) return null
    const mimeType = mimeBase(r.headers.get('content-type') || '')
    if (!mimeType.startsWith('image/')) return null
    const len = Number(r.headers.get('content-length') || 0)
    if (len && len > max * 2) return null
    const buffer = Buffer.from(await r.arrayBuffer())
    if (!buffer.length || buffer.length > max * 2) return null
    return { buffer, mimeType }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// =================== TEXTOS DE VISTA PREVIA ===================

const MEDIA_LABEL: Record<string, string> = {
  image: 'Imagen', video: 'Video', audio: 'Audio', document: 'Documento', sticker: 'Sticker',
  location: 'Ubicacion', template: 'Plantilla', interactive: 'Mensaje', button: 'Boton',
  unsupported: 'Mensaje no soportado',
}

export function previewText(type: string, text: string | null | undefined): string {
  const t = String(text || '').trim()
  if (t) return t.slice(0, 200)
  return MEDIA_LABEL[type] || 'Mensaje'
}

// =================== ESTADOS ===================

/** Orden de los estados: un "delivered" atrasado no pisa un "read". failed siempre gana. */
const STATUS_RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 }

/**
 * Fallos de entrega definitivos (no vale reintentar): el mismo numero que
 * envia (131021), sin WhatsApp (131026), marketing apagado por el usuario
 * (131050). Se marcan con `permanent: true` para que la UI no ofrezca reintento.
 */
export const PERMANENT_FAILURE_CODES = new Set([131021, 131026, 131050])

// =================== CONVERSACION DEL CONTACTO ===================

/**
 * La conversacion de un contacto, aunque hoy llegue sin telefono.
 *
 * El mismo cliente puede aparecer con su telefono o solo con su BSUID. Para
 * no partirlo en dos: se busca primero por BSUID (preferida la del telefono),
 * si no la del telefono, y si tampoco hay telefono una nueva con el BSUID.
 */
export async function resolveConversationId(storeId: string, m: { phone: string | null; bsuid: string | null; waId: string | null }): Promise<string | null> {
  if (m.bsuid) {
    const snap = await storeRef(storeId).collection('waConversations').where('bsuid', '==', m.bsuid).limit(5).get()
    const porTelefono = m.phone ? snap.docs.find(d => d.id === m.phone) : null
    const elegida = porTelefono || snap.docs[0]
    if (elegida) return elegida.id
  }
  return m.phone || m.waId || null
}

// =================== MENSAJES ENTRANTES Y ECOS ===================

export interface SaveResult {
  duplicate: boolean
  convId: string
  /** Trabajo que puede ir despues del 200 (media, push). */
  followUps: (() => Promise<void>)[]
}

/**
 * Guarda un mensaje entrante (o un eco de la app WhatsApp Business) y deja la
 * conversacion al dia.
 *
 * Idempotente: el id del documento es el wamid. Si Meta reintenta el evento
 * (lo hace seguido) la transaccion ve que ya existe y no vuelve a sumar
 * `unread` ni a mandar el push.
 */
export async function saveIncomingMessage(storeId: string, m: ParsedMessage): Promise<SaveResult> {
  if (!m.waId || !m.waMessageId) throw new Error('El mensaje llego sin remitente o sin id')
  const convId = await resolveConversationId(storeId, m)
  if (!convId) throw new Error('No se pudo resolver la conversacion')
  // Son ids de documento: nada que pueda armar otra ruta de Firestore.
  if (!isValidWaId(convId)) throw new Error('Id de contacto invalido')
  if (!isSafeDocId(m.waMessageId)) throw new Error('Id de mensaje invalido')

  const db = getDb()
  const cRef = convRef(storeId, convId)
  const mRef = cRef.collection('messages').doc(m.waMessageId)
  const isEcho = m.origin === 'echo'
  const ts = Timestamp.fromMillis(m.timestamp)
  const texto = m.text || ''

  const media = m.media ? cleanMedia(m.media) : null
  const messageDoc: Record<string, unknown> = {
    direction: isEcho ? 'out' : 'in',
    type: m.type,
    text: texto,
    ...(media ? { media } : {}),
    ...(m.replyTo ? { replyTo: m.replyTo } : {}),
    ...(m.location ? { location: m.location } : {}),
    ...(m.referral ? { referral: m.referral } : {}),
    ...(m.type === 'unsupported' ? { rawType: m.rawType } : {}),
    // Los ecos ya salieron del celular del comerciante: nacen 'sent'.
    status: isEcho ? 'sent' : 'delivered',
    ...(isEcho ? { sentBy: 'phone' } : {}),
    timestamp: ts,
    createdAt: FieldValue.serverTimestamp(),
  }

  const duplicate = await db.runTransaction(async tx => {
    const [mSnap, cSnap] = await Promise.all([tx.get(mRef), tx.get(cRef)])
    // Ya guardado (reintento de Meta). Un "stub" de estado sin direction no cuenta.
    if (mSnap.exists && mSnap.data()?.direction) return true

    const prev = cSnap.exists ? cSnap.data() || {} : null
    const prevLastAt: number = prev?.lastMessageAt?.toMillis?.() || 0
    const isNewest = m.timestamp >= prevLastAt

    // Si llego un estado antes que el mensaje (Meta no garantiza orden), se
    // conserva ese estado.
    const stubStatus = mSnap.exists ? mSnap.data()?.status : null
    tx.set(mRef, stubStatus ? { ...messageDoc, status: stubStatus } : messageDoc, { merge: true })

    const conv: Record<string, unknown> = {
      waId: convId,
      ...(m.phone ? { phone: m.phone } : {}),
      ...(m.bsuid ? { bsuid: m.bsuid } : {}),
      ...(m.username ? { username: m.username } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }
    // El nombre de perfil solo viene en los entrantes; un eco no lo pisa.
    const name = m.name || (m.username ? `@${m.username}` : null)
    if (name && !isEcho) conv.name = name

    if (isNewest) {
      conv.lastMessage = previewText(m.type, texto)
      conv.lastMessageAt = ts
      conv.lastDirection = isEcho ? 'out' : 'in'
    }

    if (isEcho) {
      // El comerciante contesto desde el celular: lo tiene leido. Un eco NO
      // abre la ventana de 24 h (solo la abre el cliente).
      conv.unread = 0
    } else {
      conv.unread = FieldValue.increment(1)
      // VENTANA DE 24 H: la regla que gobierna todo. Se guarda cuando vence
      // para que la UI no recalcule. Solo se estira, nunca se acorta.
      const prevWindow: number = prev?.windowExpiresAt?.toMillis?.() || 0
      const nuevaVentana = m.timestamp + WINDOW_24H_MS
      if (nuevaVentana > prevWindow) conv.windowExpiresAt = Timestamp.fromMillis(nuevaVentana)
      // Un mensaje nuevo REABRE una conversacion terminada; una 'pending' se
      // queda pendiente (es trabajo por hacer del comerciante).
      if (!prev || prev.status !== 'pending') conv.status = 'open'
      // Baja voluntaria: "stop", "baja"... Si despues vuelve a escribir otra
      // cosa, el propio cliente reabrio el dialogo y se levanta la marca.
      if (looksLikeOptOut(texto)) {
        conv.optOut = true
        conv.optOutAt = FieldValue.serverTimestamp()
      } else if (prev?.optOut === true && isNewest) {
        conv.optOut = false
      }
      if (m.referral && !prev?.adReferral) conv.adReferral = { ...m.referral, receivedAt: ts }
    }

    if (!prev) {
      Object.assign(conv, {
        name: conv.name ?? null,
        phone: m.phone || null,
        labels: [],
        note: '',
        optOut: conv.optOut ?? false,
        status: conv.status ?? 'open',
        windowExpiresAt: conv.windowExpiresAt ?? null,
        lastMessage: conv.lastMessage ?? previewText(m.type, texto),
        lastMessageAt: conv.lastMessageAt ?? ts,
        lastDirection: conv.lastDirection ?? (isEcho ? 'out' : 'in'),
        createdAt: FieldValue.serverTimestamp(),
      })
      if (isEcho) conv.unread = 0
    }
    tx.set(cRef, conv, { merge: true })
    return false
  })

  const followUps: (() => Promise<void>)[] = []
  if (!duplicate) {
    // Los archivos se bajan APENAS llegan (la URL de Meta caduca en minutos).
    if (m.media?.mediaId) {
      const mediaRef = m.media
      followUps.push(async () => {
        try {
          await archiveMedia(storeId, convId, m.waMessageId, mediaRef, m.type)
        } catch (e) {
          console.error(`[whatsapp] No se pudo archivar el adjunto ${m.waMessageId}:`, (e as Error).message)
          await mRef.set({ media: { archiveError: String((e as Error).message).slice(0, 200) } }, { merge: true }).catch(() => {})
        }
      })
    }
    // Aviso push solo por lo que escribe el CLIENTE.
    if (!isEcho) {
      const title = m.name || (m.username ? `@${m.username}` : m.phone ? `+${m.phone}` : 'WhatsApp')
      followUps.push(() => notifyOwner(storeId, convId, title, previewText(m.type, texto)))
    }
  }
  return { duplicate, convId, followUps }
}

function cleanMedia(media: WaMediaRef): Record<string, unknown> {
  return {
    ...(media.mediaId ? { mediaId: media.mediaId } : {}),
    mimeType: media.mimeType || null,
    ...(media.filename ? { filename: media.filename } : {}),
  }
}

/**
 * Baja un adjunto de Meta, lo guarda en R2 y deja la URL propia en el mensaje
 * (+ miniatura con medidas si es imagen). La bandeja muestra SIEMPRE nuestra
 * copia. Tambien lo usa la accion 'retry-media' de api/whatsapp.ts.
 */
export async function archiveMedia(storeId: string, convId: string, waMessageId: string, media: WaMediaRef, type: string, token?: string) {
  if (!media.mediaId) return
  const accessToken = token || (await getPrivateWa(storeId))?.accessToken
  if (!accessToken) throw new Error('La tienda no tiene WhatsApp conectado')

  const { buffer, mimeType } = await downloadWhatsappMedia({ token: accessToken, mediaId: media.mediaId })
  const realType = media.mimeType || mimeType
  const base = mediaKeyBase(storeId, convId, waMessageId)
  const { url } = await putObjectToR2({ key: `${base}.${extensionFromMime(realType)}`, body: buffer, contentType: mimeBase(realType) || 'application/octet-stream' })

  let extra: Record<string, unknown> = {}
  if (type === 'image' && mimeBase(realType).startsWith('image/')) {
    const mini = await makeThumbnail({ buffer, key: `${base}_thumb.jpg` })
    if (mini) extra = mini
  }
  await convRef(storeId, convId).collection('messages').doc(waMessageId).set({
    media: { url, mimeType: realType, ...(media.filename ? { filename: media.filename } : {}), ...extra, archiveError: FieldValue.delete() },
  }, { merge: true })
}

// =================== REACCIONES ENTRANTES ===================

/**
 * Reaccion del cliente: NO es un mensaje nuevo, se cuelga del reaccionado
 * (reactions.customer). No abre la ventana de 24 h. En un eco (el comerciante
 * reacciono desde el celular) va a reactions.mine.
 */
export async function saveIncomingReaction(storeId: string, m: ParsedMessage): Promise<SaveResult> {
  const convId = await resolveConversationId(storeId, m)
  if (!convId || !m.reaction) return { duplicate: false, convId: convId || '', followUps: [] }
  if (!isValidWaId(convId) || !isSafeDocId(m.reaction.messageId)) throw new Error('Reaccion con ids invalidos')
  const isEcho = m.origin === 'echo'
  const cRef = convRef(storeId, convId)
  const cSnap = await cRef.get()
  if (!cSnap.exists) return { duplicate: false, convId, followUps: [] }

  const emoji = m.reaction.emoji
  const target = cRef.collection('messages').doc(m.reaction.messageId)
  const tSnap = await target.get()
  if (tSnap.exists) {
    await target.set({ reactions: { [isEcho ? 'mine' : 'customer']: emoji || FieldValue.delete() } }, { merge: true })
  }

  const followUps: (() => Promise<void>)[] = []
  if (!isEcho) {
    const prevLastAt: number = cSnap.data()?.lastMessageAt?.toMillis?.() || 0
    if (m.timestamp >= prevLastAt) {
      await cRef.set({
        lastMessage: emoji ? `Reacciono ${emoji}` : 'Quito una reaccion',
        lastMessageAt: Timestamp.fromMillis(m.timestamp),
        lastDirection: 'in',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    }
    if (emoji) {
      const title = cSnap.data()?.name || m.name || (m.phone ? `+${m.phone}` : 'WhatsApp')
      followUps.push(() => notifyOwner(storeId, convId, title, `Reacciono ${emoji} a tu mensaje`))
    }
  }
  return { duplicate: false, convId, followUps }
}

// =================== ESTADOS (sent / delivered / read / failed) ===================

export async function applyStatus(storeId: string, s: ParsedStatus) {
  if (!s.waId || !s.waMessageId || !s.status) return
  if (!isValidWaId(s.waId) || !isSafeDocId(s.waMessageId)) throw new Error('Estado con ids invalidos')
  const convId = (await resolveConversationId(storeId, {
    phone: isBsuid(s.waId) ? null : s.waId,
    bsuid: isBsuid(s.waId) ? s.waId : null,
    waId: s.waId,
  })) || s.waId
  const cRef = convRef(storeId, convId)
  const mRef = cRef.collection('messages').doc(s.waMessageId)
  const newStatus: string = s.status

  await getDb().runTransaction(async tx => {
    const [mSnap, cSnap] = await Promise.all([tx.get(mRef), tx.get(cRef)])
    if (!cSnap.exists) return // conversacion desconocida: no se crean huerfanos
    const prev = mSnap.exists ? mSnap.data() || {} : null
    const prevStatus: string | undefined = prev?.status

    if (newStatus === 'failed') {
      if (prevStatus === 'failed') return
      tx.set(mRef, {
        status: 'failed',
        error: s.error || 'No se pudo entregar',
        ...(s.errorCode != null ? { errorCode: s.errorCode, permanent: PERMANENT_FAILURE_CODES.has(Number(s.errorCode)) } : {}),
        statusAt: Timestamp.fromMillis(s.timestamp),
      }, { merge: true })
      return
    }
    if (!(newStatus in STATUS_RANK)) return
    if (prevStatus === 'failed') return
    if (prevStatus && (STATUS_RANK[prevStatus] ?? -1) >= STATUS_RANK[newStatus]) return
    // merge: el estado puede llegar ANTES que el mensaje que lo origino. Queda
    // un stub sin `timestamp` (no aparece en la UI ordenada por timestamp)
    // hasta que se escriba el mensaje, que respeta este estado.
    tx.set(mRef, { status: newStatus, statusAt: Timestamp.fromMillis(s.timestamp) }, { merge: true })
  })
}

// =================== CONTACTOS (coexistencia) ===================

/**
 * smb_app_state_sync: contactos de la app WhatsApp Business. Fase 1: solo se
 * completa el nombre de conversaciones que ya existen y no lo tienen. No se
 * crean conversaciones vacias.
 */
export async function applyContactSyncs(storeId: string, list: ParsedContactSync[]) {
  const utiles = list.filter(c => isValidWaId(c.phone) && c.name && c.action !== 'remove').slice(0, 200)
  for (const c of utiles) {
    try {
      const ref = convRef(storeId, c.phone!)
      const snap = await ref.get()
      if (snap.exists && !snap.data()?.name) {
        await ref.set({ name: c.name, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      }
    } catch (e) {
      console.warn('[whatsapp] contacto no aplicado:', (e as Error).message)
    }
  }
}

// =================== SALIENTES ===================

/**
 * Guarda un mensaje que mandamos nosotros. Transaccion porque el webhook de
 * estado puede haber llegado antes (stub con 'delivered'/'read'): ese estado
 * se respeta en vez de pisarlo con 'sent'.
 */
export async function saveOutgoingMessage(storeId: string, convId: string, waMessageId: string, data: Record<string, unknown>, convUpdate: Record<string, unknown>) {
  const cRef = convRef(storeId, convId)
  const mRef = cRef.collection('messages').doc(waMessageId)
  const ts = (data.timestamp as Timestamp) || Timestamp.now()
  await getDb().runTransaction(async tx => {
    const mSnap = await tx.get(mRef)
    const stubStatus: string | undefined = mSnap.exists ? mSnap.data()?.status : undefined
    const status = stubStatus && stubStatus !== 'pending' ? stubStatus : (data.status || 'sent')
    tx.set(mRef, {
      direction: 'out',
      ...data,
      status,
      timestamp: ts,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    tx.set(cRef, {
      lastMessageAt: ts,
      lastDirection: 'out',
      unread: 0,
      updatedAt: FieldValue.serverTimestamp(),
      ...convUpdate,
    }, { merge: true })
  })
}

// =================== PUSH AL DUEÑO ===================

/**
 * Aviso push a los dispositivos del dueño (users/{ownerId}/pushTokens), mismo
 * envio que notifyNewOrder. data.type = 'whatsapp-message' lo usa la app para
 * abrir la conversacion al tocar. Que falle el aviso nunca cuesta el mensaje.
 */
export async function notifyOwner(storeId: string, waId: string, title: string, body: string) {
  try {
    const db = getDb()
    const store = await storeRef(storeId).get()
    const ownerId: string | undefined = store.data()?.ownerId
    if (!ownerId) return
    const tokensSnap = await db.collection('users').doc(ownerId).collection('pushTokens').get()
    if (tokensSnap.empty) return
    const docs = tokensSnap.docs.filter(d => d.data().token)
    const tokens = docs.map(d => d.data().token as string)
    if (!tokens.length) return

    const stale: string[] = []
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500)
      const response = await getMessaging().sendEachForMulticast({
        tokens: batch,
        notification: { title: title.slice(0, 80), body: body.slice(0, 180) },
        data: { type: 'whatsapp-message', storeId, waId },
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      })
      response.responses.forEach((r, idx) => {
        if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
          const d = docs[i + idx]
          if (d) stale.push(d.id)
        }
      })
    }
    if (stale.length) {
      const wb = db.batch()
      for (const id of stale) wb.delete(db.collection('users').doc(ownerId).collection('pushTokens').doc(id))
      await wb.commit()
    }
  } catch (e) {
    console.error('[whatsapp] No se pudo enviar el aviso push:', (e as Error).message)
  }
}

// =================== SIN PROCESAR ===================

/**
 * Lo que no se pudo guardar se aparta con TODO lo que mando Meta: al webhook
 * se le responde 200 siempre y Meta no reenvia, asi que esta copia es la unica.
 */
export async function saveUnprocessed(p: { storeId?: string | null; phoneNumberId?: string | null; waMessageId?: string | null; kind: string; raw: unknown; error: unknown }) {
  const msg = String((p.error as Error)?.message || p.error).slice(0, 500)
  console.error(`[whatsapp] ${p.kind} ${p.waMessageId || ''} sin procesar:`, msg)
  try {
    const col = getDb().collection('waUnprocessed')
    const ref = p.waMessageId ? col.doc(`${p.kind}_${String(p.waMessageId).replace(/\//g, '_').slice(0, 400)}`) : col.doc()
    await ref.set({
      kind: p.kind,
      storeId: p.storeId || null,
      phoneNumberId: p.phoneNumberId || null,
      waMessageId: p.waMessageId || null,
      raw: JSON.stringify(p.raw ?? null).slice(0, 200_000),
      error: msg,
      processed: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (e) {
    console.error('[whatsapp] Ni siquiera se pudo apartar:', (e as Error).message)
  }
}

