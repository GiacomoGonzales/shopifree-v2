import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { hasBusinessEffectivePlan, type StorePlanData } from './_shared/plan.js'
import { isAdminToken } from './_shared/admin.js'
import {
  MetaError, MEDIA_PERMITIDOS, mimeBase, extensionFromMime, normalizePhone,
  exchangeCodeForToken, listWabaPhoneNumbers, subscribeAppToWaba, registerPhoneNumber, requestSmbAppDataSync,
  sendWhatsappText, sendWhatsappMedia, sendWhatsappReaction, markWhatsappMessageRead,
  isValidWaId, isSafeDocId,
} from './_shared/whatsappGraph.js'
import {
  getDb, storeRef, privateWaRef, waSettingsRef, convRef, waNumberRef, getPrivateWa,
  putObjectToR2, makeThumbnail, webpToJpeg, mediaKeyBase, r2PublicBase, saveOutgoingMessage, archiveMedia,
  previewText, storeMediaPrefix, outgoingUploadKey, presignR2Put, getWaitUntil, fetchProductImage, type PrivateWa,
} from './_shared/whatsappInbox.js'
import { setupOrderTemplates } from './_shared/whatsappOrderNotify.js'
import { parseTemplateBody, sendTemplateMessage, syncTemplatesFor } from './_shared/whatsappTemplateSend.js'
import {
  assertPublicHost, checkBotUrl, deliver, getBotSecret, newEventId, readBotWebhook, recordDelivery, rotateBotSecret, type BotPayload,
} from './_shared/shopichatBotWebhook.js'

/**
 * ShopiChat — acciones del comerciante sobre su WhatsApp.
 *
 * POST { action, storeId, ... } con Authorization: Bearer <Firebase ID token>.
 * El uid tiene que ser el dueño de la tienda (stores/{id}.ownerId) o admin.
 * Todo exige plan Business efectivo (403 { error: 'PLAN_REQUIRED' }) salvo
 * 'status' (la UI muestra el upsell/estado) y 'disconnect' (desconectar nunca
 * se bloquea, aunque el plan haya vencido).
 *
 * Acciones: status, connect, connect-manual (solo admin), disconnect,
 * send-text, send-media, upload-url, mark-read, react, sync-templates,
 * send-template, retry-media, setup-order-templates, bot-webhook-secret,
 * bot-webhook-test (fase 3C: "conecta tu propio bot").
 *
 * send-media acepta ademas { productId, mediaUrl } para mandar un producto
 * como tarjeta: la foto tiene que ser una de las de ese producto de la tienda
 * (ver productImageUrl) y se re-sube bajo whatsapp/{storeId}/.
 *
 * Errores con codigo estable para la UI: PLAN_REQUIRED, NOT_CONNECTED,
 * WINDOW_CLOSED, OPTED_OUT, NUMBER_IN_USE, CONVERSATION_NOT_FOUND,
 * TEMPLATE_NOT_FOUND, TEMPLATE_NOT_APPROVED, MEDIA_TOO_LARGE,
 * MEDIA_TYPE_NOT_ALLOWED, META_ERROR (+ message y metaCode).
 *
 * Limite de Vercel: el body de una funcion es ~4.5 MB. En send-media el
 * base64 infla ~1.37x, asi que por esta via entran archivos de hasta ~3.2 MB.
 * Para mas, el front pide 'upload-url' (PUT prefirmado a R2), sube directo y
 * manda `mediaUrl` en send-media.
 *
 * Env: META_APP_ID, META_APP_SECRET, FIREBASE_*, R2_*.
 */

type Body = Record<string, unknown>
interface Ctx {
  uid: string
  isAdmin: boolean
  storeId: string
  store: Record<string, unknown>
  body: Body
}
interface Result { status: number; data: Record<string, unknown> }

const ok = (data: Record<string, unknown> = {}): Result => ({ status: 200, data: { ok: true, ...data } })
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): Result => ({ status, data: { error, ...extra } })

const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** waId del body: telefono o BSUID; cualquier otra cosa → '' (es id de documento). */
const waIdOf = (v: unknown) => {
  const s = str(v, 128)
  return isValidWaId(s) ? s : ''
}
/** Id de mensaje del body (wamid, id de documento). */
const msgIdOf = (v: unknown) => {
  const s = str(v, 512)
  return isSafeDocId(s) ? s : ''
}

/**
 * mediaUrl de send-media: solo archivos de ESTA tienda en nuestro R2
 * (whatsapp/{storeId}/...). Devuelve la URL normalizada o null.
 */
function ownMediaUrl(raw: string, storeId: string): string | null {
  try {
    const u = new URL(raw)
    const base = new URL(`${r2PublicBase()}/`)
    if (u.origin !== base.origin || u.search || u.hash) return null
    const prefix = `${base.pathname}${storeMediaPrefix(storeId)}`
    return u.pathname.startsWith(prefix) ? u.toString() : null
  } catch {
    return null
  }
}

/**
 * Imagen de un PRODUCTO de la tienda para mandarlo como tarjeta ('send-media'
 * con productId). Las fotos de producto viven en nuestro R2 pero bajo
 * {carpeta}/{uid}/..., no bajo whatsapp/{storeId}/, asi que ownMediaUrl no las
 * acepta. Se aceptan solo si:
 *  - son https de NUESTRO R2 (mismo origen que R2_PUBLIC_URL), sin query ni hash;
 *  - el producto existe en stores/{storeId}/products/{productId} (o sea, es de
 *    ESTA tienda: el uid ya se verifico como dueño) y la URL es exactamente una
 *    de sus imagenes (principal, galeria o de una combinacion).
 * Devuelve la URL normalizada o null.
 */
async function productImageUrl(raw: string, storeId: string, productId: string): Promise<string | null> {
  if (!raw || !productId || !isSafeDocId(productId) || productId.length > 128) return null
  let target: string
  try {
    const u = new URL(raw)
    const base = new URL(`${r2PublicBase()}/`)
    if (u.protocol !== 'https:' || u.origin !== base.origin || u.search || u.hash) return null
    target = u.toString()
  } catch {
    return null
  }
  const snap = await storeRef(storeId).collection('products').doc(productId).get()
  if (!snap.exists) return null
  const p = snap.data() || {}
  const combos = Array.isArray(p.combinations) ? (p.combinations as Array<{ image?: unknown }>) : []
  const candidates = [p.image, ...(Array.isArray(p.images) ? p.images : []), ...combos.map(c => c?.image)]
  const same = (s: unknown) => {
    if (typeof s !== 'string' || !s) return false
    try { return new URL(s).toString() === target } catch { return false }
  }
  return candidates.some(same) ? target : null
}

/** Error de Meta → respuesta. 131047 = paso la ventana de 24 h (re-engagement). */
function metaFail(e: unknown): Result {
  if (e instanceof MetaError) {
    if (e.metaCode === 131047) return fail(409, 'WINDOW_CLOSED', { message: 'La ventana de 24 horas se cerro. Hace falta una plantilla aprobada.' })
    return fail(502, 'META_ERROR', { message: e.metaDetails || e.message, metaCode: e.metaCode })
  }
  throw e
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/** Timestamps → ISO para la respuesta JSON (en Firestore quedan como Timestamp). */
function serialize(doc: Record<string, unknown> | undefined | null): Record<string, unknown> | null {
  if (!doc) return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(doc)) {
    out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v
  }
  return out
}

async function requireConnected(storeId: string): Promise<PrivateWa | Result> {
  const wa = await getPrivateWa(storeId)
  return wa || fail(409, 'NOT_CONNECTED', { message: 'La tienda no tiene WhatsApp conectado' })
}
const isResult = (x: unknown): x is Result => !!x && typeof x === 'object' && 'status' in x && 'data' in x

/** Conversacion existente + chequeos comunes de envio libre (opt-out y ventana). */
async function loadConvForFreeForm(storeId: string, waId: string): Promise<Record<string, unknown> | Result> {
  if (!waId) return fail(400, 'MISSING_WAID')
  const snap = await convRef(storeId, waId).get()
  if (!snap.exists) return fail(404, 'CONVERSATION_NOT_FOUND')
  const conv = snap.data() || {}
  if (conv.optOut === true) {
    return fail(409, 'OPTED_OUT', { message: 'Este contacto pidio no recibir mas mensajes' })
  }
  const vence = (conv.windowExpiresAt as Timestamp | null)?.toMillis?.() || 0
  if (Date.now() > vence) {
    return fail(409, 'WINDOW_CLOSED', {
      message: 'La ventana de 24 horas se cerro. Para escribirle ahora hace falta una plantilla aprobada por Meta.',
      windowExpiredAt: vence ? new Date(vence).toISOString() : null,
    })
  }
  return conv
}

// =================== CONEXION ===================

/**
 * Lo comun a connect y connect-manual: valida el numero contra la WABA,
 * suscribe la app, registra (salvo coexistencia) y escribe los 3 docs.
 */
async function finishConnect(p: {
  storeId: string; token: string; wabaId: string; phoneNumberId?: string
  coexistence: boolean; register: boolean; subscribeStrict: boolean
}): Promise<Result> {
  const { storeId, token, wabaId, coexistence } = p

  // El numero tiene que ser de esta WABA (y el token tiene que poder verla).
  let phones
  try {
    phones = await listWabaPhoneNumbers({ token, wabaId })
  } catch (e) {
    return metaFail(e)
  }
  let phone = p.phoneNumberId ? phones.find(x => x.id === p.phoneNumberId) : undefined
  if (p.phoneNumberId && !phone) return fail(400, 'PHONE_NOT_IN_WABA', { message: 'El numero no pertenece a esa cuenta de WhatsApp' })
  if (!phone) {
    // Coexistencia: el evento FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING solo trae
    // waba_id. Se toma el numero de la WABA (normalmente hay uno solo).
    if (!phones.length) return fail(400, 'NO_PHONE_NUMBERS', { message: 'La cuenta de WhatsApp no tiene numeros' })
    if (phones.length > 1) console.warn(`[whatsapp] WABA ${wabaId} con ${phones.length} numeros; se toma el primero libre`)
    for (const cand of phones) {
      const m = await waNumberRef(cand.id).get()
      if (!m.exists || m.data()?.storeId === storeId) { phone = cand; break }
    }
    phone = phone || phones[0]
  }
  const phoneNumberId = phone.id

  // Un numero = una tienda. Pre-chequeo antes de tocar Meta.
  const mapping = await waNumberRef(phoneNumberId).get()
  if (mapping.exists && mapping.data()?.storeId !== storeId) {
    return fail(409, 'NUMBER_IN_USE', { message: 'Ese numero ya esta conectado a otra tienda' })
  }

  try {
    await subscribeAppToWaba({ token, wabaId })
  } catch (e) {
    if (p.subscribeStrict) return metaFail(e)
    console.warn('[whatsapp] subscribed_apps fallo (connect-manual):', (e as Error).message)
  }

  let pin: string | null = null
  if (p.register) {
    // PIN de verificacion en dos pasos: se guarda (privado) por si hay que re-registrar.
    pin = String(crypto.randomInt(100000, 1000000))
    try {
      await registerPhoneNumber({ token, phoneNumberId, pin })
    } catch (e) {
      const msg = e instanceof MetaError ? (e.metaDetails || e.message) : String(e)
      await waSettingsRef(storeId, 'account').set({
        status: 'error', lastError: msg.slice(0, 300), phoneNumberId, wabaId,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
      return metaFail(e)
    }
  }

  const connectedAt = Timestamp.now()
  const account = {
    status: 'connected',
    displayNumber: phone.display_phone_number || null,
    verifiedName: phone.verified_name || null,
    phoneNumberId,
    wabaId,
    coexistence,
    connectedAt,
    lastError: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  const db = getDb()
  try {
    await db.runTransaction(async tx => {
      const [mSnap, privSnap] = await Promise.all([tx.get(waNumberRef(phoneNumberId)), tx.get(privateWaRef(storeId))])
      if (mSnap.exists && mSnap.data()?.storeId !== storeId) throw new Error('NUMBER_IN_USE')
      // Si la tienda tenia OTRO numero conectado, se suelta ese mapeo.
      const prevPid = privSnap.data()?.phoneNumberId as string | undefined
      if (prevPid && prevPid !== phoneNumberId) {
        const prevMap = await tx.get(waNumberRef(prevPid))
        if (prevMap.data()?.storeId === storeId) tx.delete(waNumberRef(prevPid))
      }
      tx.set(privateWaRef(storeId), {
        accessToken: token,
        wabaId,
        phoneNumberId,
        displayNumber: account.displayNumber,
        verifiedName: account.verifiedName,
        coexistence,
        connectedAt,
        ...(pin ? { pin } : {}),
      })
      tx.set(waNumberRef(phoneNumberId), { storeId, wabaId, updatedAt: FieldValue.serverTimestamp() })
      tx.set(waSettingsRef(storeId, 'account'), account, { merge: true })
    })
  } catch (e) {
    if ((e as Error).message === 'NUMBER_IN_USE') return fail(409, 'NUMBER_IN_USE', { message: 'Ese numero ya esta conectado a otra tienda' })
    throw e
  }

  // Coexistencia: contactos de la app (llegan por webhook smb_app_state_sync).
  // Solo se puede dentro de las 24 h del onboarding. El historial (history) no
  // se pide en fase 1.
  if (coexistence) {
    await requestSmbAppDataSync({ token, phoneNumberId, syncType: 'smb_app_state_sync' })
      .catch(e => console.warn('[whatsapp] smb_app_data contactos fallo:', (e as Error).message))
  }
  await syncTemplatesFor(storeId, token, wabaId).catch(e => console.warn('[whatsapp] sync de plantillas fallo:', (e as Error).message))

  // Avisos automaticos de pedidos: se crean las plantillas que falten (best
  // effort). Con waitUntil va despues de responder; si no, con presupuesto
  // para no demorar la conexion.
  const setup = autoSetupOrderTemplates(storeId, token, wabaId)
  const waitUntil = getWaitUntil()
  if (waitUntil) waitUntil(setup)
  else await Promise.race([setup, new Promise(r => setTimeout(r, 8_000))])

  const { lastError: _le, updatedAt: _ua, ...publicAccount } = account
  void _le; void _ua
  return ok({ account: serialize(publicAccount) })
}

/** Plantillas de avisos despues de conectar. Nunca lanza: la conexion ya quedo hecha. */
async function autoSetupOrderTemplates(storeId: string, token: string, wabaId: string): Promise<void> {
  try {
    const store = (await storeRef(storeId).get()).data() || {}
    const r = await setupOrderTemplates({ storeId, token, wabaId, storeLanguage: store.language })
    if (r.errors.length) console.warn(`[whatsapp] plantillas de avisos con errores (${storeId}):`, r.errors.map(e => `${e.name}: ${e.message}`).join(' | '))
  } catch (e) {
    console.warn('[whatsapp] plantillas de avisos fallo:', (e as Error).message)
  }
}

async function actionConnect(ctx: Ctx): Promise<Result> {
  const code = str(ctx.body.code, 2000)
  const wabaId = str(ctx.body.wabaId, 64)
  const phoneNumberId = str(ctx.body.phoneNumberId, 64) || undefined
  const coexistence = ctx.body.coexistence === true
  if (!code || !wabaId) return fail(400, 'MISSING_PARAMS', { message: 'Faltan code y wabaId' })

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return fail(500, 'SERVER_MISCONFIGURED', { message: 'META_APP_ID / META_APP_SECRET no configurados' })

  let token: string
  try {
    token = await exchangeCodeForToken({ appId, appSecret, code })
  } catch (e) {
    return metaFail(e)
  }
  return finishConnect({
    storeId: ctx.storeId, token, wabaId, phoneNumberId, coexistence,
    register: !coexistence, subscribeStrict: true,
  })
}

/** Solo admin: conectar un numero de prueba de Meta con un token pegado a mano. */
async function actionConnectManual(ctx: Ctx): Promise<Result> {
  if (!ctx.isAdmin) return fail(403, 'ADMIN_ONLY')
  const token = str(ctx.body.accessToken, 2000)
  const wabaId = str(ctx.body.wabaId, 64)
  const phoneNumberId = str(ctx.body.phoneNumberId, 64)
  if (!token || !wabaId || !phoneNumberId) return fail(400, 'MISSING_PARAMS', { message: 'Faltan accessToken, phoneNumberId y wabaId' })
  return finishConnect({
    storeId: ctx.storeId, token, wabaId, phoneNumberId, coexistence: false,
    // El numero de prueba de Meta ya viene registrado.
    register: false, subscribeStrict: false,
  })
}

/**
 * Desconectar: se suelta el mapeo y el token; las conversaciones quedan. NO se
 * des-registra el numero en Meta (en coexistencia romperia la app del celular).
 */
async function actionDisconnect(ctx: Ctx): Promise<Result> {
  const db = getDb()
  await db.runTransaction(async tx => {
    const priv = await tx.get(privateWaRef(ctx.storeId))
    const pid = priv.data()?.phoneNumberId as string | undefined
    if (pid) {
      const m = await tx.get(waNumberRef(pid))
      if (m.data()?.storeId === ctx.storeId) tx.delete(waNumberRef(pid))
    }
    tx.delete(privateWaRef(ctx.storeId))
    tx.set(waSettingsRef(ctx.storeId, 'account'), {
      status: 'disconnected',
      disconnectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  })
  const snap = await waSettingsRef(ctx.storeId, 'account').get()
  return ok({ account: serialize(snap.data()) })
}

async function actionStatus(ctx: Ctx): Promise<Result> {
  const snap = await waSettingsRef(ctx.storeId, 'account').get()
  return ok({
    account: serialize(snap.exists ? snap.data() : null),
    businessPlan: hasBusinessEffectivePlan(ctx.store as StorePlanData),
  })
}

// =================== MENSAJES ===================

async function actionSendText(ctx: Ctx): Promise<Result> {
  const waId = waIdOf(ctx.body.waId)
  const text = str(ctx.body.text, 4096)
  const replyTo = str(ctx.body.replyTo, 200) || null
  if (!text) return fail(400, 'MISSING_TEXT')

  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa
  const conv = await loadConvForFreeForm(ctx.storeId, waId)
  if (isResult(conv)) return conv

  let waMessageId: string
  try {
    ({ waMessageId } = await sendWhatsappText({ token: wa.accessToken, phoneNumberId: wa.phoneNumberId, to: waId, text, replyTo }))
  } catch (e) {
    return metaFail(e)
  }
  await saveOutgoingMessage(ctx.storeId, waId, waMessageId, {
    type: 'text', text, ...(replyTo ? { replyTo } : {}), status: 'sent', sentBy: ctx.uid,
  }, { lastMessage: previewText('text', text) })
  return ok({ messageId: waMessageId })
}

async function actionSendMedia(ctx: Ctx): Promise<Result> {
  const waId = waIdOf(ctx.body.waId)
  const mediaBase64 = typeof ctx.body.mediaBase64 === 'string' ? ctx.body.mediaBase64 : ''
  const mediaUrl = str(ctx.body.mediaUrl, 2000)
  let mimeType = mimeBase(ctx.body.mimeType)
  const filename = str(ctx.body.filename, 200) || undefined
  const caption = str(ctx.body.caption, 1024) || undefined
  const replyTo = str(ctx.body.replyTo, 200) || null
  const asSticker = ctx.body.asSticker === true
  // Producto mandado como tarjeta: su foto (de su galeria, en nuestro R2).
  const productId = str(ctx.body.productId, 128)
  if ((!mediaBase64 && !mediaUrl) || !mimeType) return fail(400, 'MISSING_PARAMS', { message: 'Faltan el archivo (mediaBase64 o mediaUrl) y mimeType' })

  const permitido = MEDIA_PERMITIDOS[mimeType]
  if (!permitido) return fail(400, 'MEDIA_TYPE_NOT_ALLOWED', { message: 'Tipo de archivo no admitido por WhatsApp' })
  // Un webp es imagen O sticker; como imagen Meta lo rechaza.
  const type = asSticker && mimeType === 'image/webp' ? 'sticker' : permitido.type

  // mediaUrl: solo archivos de ESTA tienda en NUESTRO R2 (ya subidos), no
  // cualquier enlace. O, con productId, una foto de un producto de la tienda.
  const ownUrl = mediaBase64 ? null : ownMediaUrl(mediaUrl, ctx.storeId)
  const productUrl = !mediaBase64 && !ownUrl && productId && type === 'image'
    ? await productImageUrl(mediaUrl, ctx.storeId, productId)
    : null
  if (!mediaBase64 && !ownUrl && !productUrl) {
    return fail(400, 'MEDIA_URL_NOT_ALLOWED', { message: 'mediaUrl tiene que ser un archivo de la tienda ya subido a R2' })
  }

  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa
  const conv = await loadConvForFreeForm(ctx.storeId, waId)
  if (isResult(conv)) return conv

  let url = ownUrl || ''
  let thumb: { thumbUrl: string; width?: number; height?: number } | null = null
  let source: Buffer | null = null
  if (productUrl) {
    // Se baja y se re-sube bajo whatsapp/{storeId}/ (webp → JPEG en el camino).
    const img = await fetchProductImage(productUrl, permitido.max)
    if (!img) return fail(400, 'MEDIA_URL_NOT_ALLOWED', { message: 'No se pudo usar la imagen del producto' })
    source = img.buffer
    mimeType = img.mimeType
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
      const jpg = await webpToJpeg(source)
      if (!jpg) return fail(400, 'MEDIA_TYPE_NOT_ALLOWED', { message: 'No se pudo convertir la imagen del producto' })
      source = jpg
      mimeType = 'image/jpeg'
    }
  } else if (mediaBase64) {
    source = Buffer.from(mediaBase64, 'base64')
  }
  if (source) {
    let buffer: Buffer = source
    if (!buffer.length) return fail(400, 'EMPTY_MEDIA')
    if (buffer.length > permitido.max) {
      return fail(413, 'MEDIA_TOO_LARGE', { message: `El limite de WhatsApp para este tipo es ${Math.round(permitido.max / 1024 / 1024)} MB` })
    }
    if (type === 'image' && mimeType === 'image/webp') {
      const jpg = await webpToJpeg(buffer)
      if (!jpg) return fail(400, 'MEDIA_TYPE_NOT_ALLOWED', { message: 'WhatsApp no acepta imagenes webp; envia JPG o PNG' })
      buffer = jpg
      mimeType = 'image/jpeg'
    }
    const base = mediaKeyBase(ctx.storeId, waId, `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    url = (await putObjectToR2({ key: `${base}.${extensionFromMime(mimeType)}`, body: buffer, contentType: mimeType })).url
    if (type === 'image') thumb = await makeThumbnail({ buffer, key: `${base}_thumb.jpg` })
  } else if (type === 'image' && mimeType === 'image/webp') {
    return fail(400, 'MEDIA_TYPE_NOT_ALLOWED', { message: 'WhatsApp no acepta imagenes webp por URL; envia JPG o PNG' })
  }

  let waMessageId: string
  try {
    ({ waMessageId } = await sendWhatsappMedia({
      token: wa.accessToken, phoneNumberId: wa.phoneNumberId, to: waId, type, link: url,
      caption, filename: type === 'document' ? (filename || `documento.${extensionFromMime(mimeType)}`) : undefined, replyTo,
    }))
  } catch (e) {
    return metaFail(e)
  }

  await saveOutgoingMessage(ctx.storeId, waId, waMessageId, {
    type,
    text: caption || '',
    media: { url, mimeType, ...(filename ? { filename } : {}), ...(thumb || {}) },
    ...(replyTo ? { replyTo } : {}),
    status: 'sent',
    sentBy: ctx.uid,
  }, { lastMessage: previewText(type, caption) })
  return ok({ messageId: waMessageId, media: { url, mimeType, ...(thumb || {}) } })
}

/**
 * URL prefirmada para subir DIRECTO a R2 archivos que no entran por el body de
 * Vercel (audio/video hasta 16 MB, documentos hasta 100 MB). El navegador hace
 * PUT con el mismo Content-Type y despues llama send-media con `mediaUrl`.
 */
async function actionUploadUrl(ctx: Ctx): Promise<Result> {
  const mimeType = mimeBase(ctx.body.mimeType)
  const size = Number(ctx.body.size)
  const permitido = MEDIA_PERMITIDOS[mimeType]
  if (!permitido) return fail(400, 'MEDIA_TYPE_NOT_ALLOWED', { message: 'Tipo de archivo no admitido por WhatsApp' })
  // webp: send-media lo rechaza por URL (hay que convertirlo); no tiene sentido subirlo.
  if (mimeType === 'image/webp') return fail(400, 'MEDIA_TYPE_NOT_ALLOWED', { message: 'WhatsApp no acepta imagenes webp; envia JPG o PNG' })
  if (!Number.isInteger(size) || size <= 0) return fail(400, 'MISSING_PARAMS', { message: 'Falta size (bytes)' })
  if (size > permitido.max) {
    return fail(413, 'MEDIA_TOO_LARGE', { message: `El limite de WhatsApp para este tipo es ${Math.round(permitido.max / 1024 / 1024)} MB` })
  }
  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa

  const key = outgoingUploadKey(ctx.storeId, extensionFromMime(mimeType))
  const expiresIn = 600
  const uploadUrl = await presignR2Put({ key, contentType: mimeType, contentLength: size, expiresIn })
  return ok({
    uploadUrl,
    mediaUrl: `${r2PublicBase()}/${key}`,
    headers: { 'Content-Type': mimeType },
    expiresIn,
  })
}

async function actionMarkRead(ctx: Ctx): Promise<Result> {
  const waId = waIdOf(ctx.body.waId)
  if (!waId) return fail(400, 'MISSING_WAID')
  const cRef = convRef(ctx.storeId, waId)
  const cSnap = await cRef.get()
  if (!cSnap.exists) return fail(404, 'CONVERSATION_NOT_FOUND')

  // Ultimo entrante (sin indice compuesto: se filtra en memoria).
  const recientes = await cRef.collection('messages').orderBy('timestamp', 'desc').limit(30).get()
  const ultimo = recientes.docs.find(d => d.data().direction === 'in')

  await cRef.set({ unread: 0, updatedAt: FieldValue.serverTimestamp() }, { merge: true })

  let receipt = false
  if (ultimo) {
    const wa = await getPrivateWa(ctx.storeId)
    if (wa) {
      try {
        await markWhatsappMessageRead({ token: wa.accessToken, phoneNumberId: wa.phoneNumberId, messageId: ultimo.id })
        receipt = true
        await ultimo.ref.set({ status: 'read' }, { merge: true })
      } catch (e) {
        // Un read receipt perdido no es grave.
        console.warn('[whatsapp] mark-read fallo:', (e as Error).message)
      }
    }
  }
  return ok({ receipt })
}

async function actionReact(ctx: Ctx): Promise<Result> {
  const waId = waIdOf(ctx.body.waId)
  const messageId = msgIdOf(ctx.body.messageId)
  const emoji = str(ctx.body.emoji, 16)
  if (!waId || !messageId) return fail(400, 'MISSING_PARAMS')

  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa
  const cRef = convRef(ctx.storeId, waId)
  if (!(await cRef.get()).exists) return fail(404, 'CONVERSATION_NOT_FOUND')
  const mRef = cRef.collection('messages').doc(messageId)
  if (!(await mRef.get()).exists) return fail(404, 'MESSAGE_NOT_FOUND')

  try {
    await sendWhatsappReaction({ token: wa.accessToken, phoneNumberId: wa.phoneNumberId, to: waId, messageId, emoji })
  } catch (e) {
    return metaFail(e)
  }
  await mRef.set({ reactions: { mine: emoji || FieldValue.delete() } }, { merge: true })
  return ok()
}

// =================== PLANTILLAS ===================

async function actionSyncTemplates(ctx: Ctx): Promise<Result> {
  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa
  try {
    const items = await syncTemplatesFor(ctx.storeId, wa.accessToken, wa.wabaId)
    return ok({ count: items.length })
  } catch (e) {
    return metaFail(e)
  }
}

/**
 * Plantilla: funciona FUERA de la ventana (para eso existen). Si viene `phone`
 * y no hay conversacion, la crea. Respeta la baja voluntaria.
 */
async function actionSendTemplate(ctx: Ctx): Promise<Result> {
  const parsed = parseTemplateBody(ctx.body)
  if (!parsed.ok) return fail(parsed.status, parsed.error, parsed.message ? { message: parsed.message } : {})

  let waId = waIdOf(ctx.body.waId)
  if (!waId) {
    const phone = normalizePhone(ctx.body.phone)
    if (!phone) return fail(400, 'INVALID_PHONE', { message: 'Telefono invalido (con codigo de pais, solo digitos)' })
    waId = phone
  }

  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa

  try {
    const r = await sendTemplateMessage(ctx.storeId, wa, {
      waId,
      requireExisting: Boolean(ctx.body.waId && !ctx.body.phone),
      name: parsed.name,
      language: parsed.language,
      params: parsed.params,
      headerText: parsed.headerText,
      headerImageUrl: parsed.headerImageUrl,
      sentBy: ctx.uid,
    })
    if (!r.ok) return fail(r.status, r.error, r.message ? { message: r.message } : {})
    return ok({ messageId: r.messageId, waId: r.waId })
  } catch (e) {
    return metaFail(e)
  }
}

/**
 * Avisos automaticos de pedidos: crea en la WABA las plantillas UTILITY que
 * falten (idioma de la tienda) y sincroniza el catalogo. Solo el dueño (o
 * admin) y con plan Business (lo exige el handler).
 */
async function actionSetupOrderTemplates(ctx: Ctx): Promise<Result> {
  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa
  try {
    const r = await setupOrderTemplates({ storeId: ctx.storeId, token: wa.accessToken, wabaId: wa.wabaId, storeLanguage: ctx.store.language })
    return ok({ language: r.language, created: r.created, existing: r.existing, errors: r.errors })
  } catch (e) {
    return metaFail(e)
  }
}

/** Reintenta bajar a R2 un adjunto entrante que no se archivo (el mediaId de Meta vale ~30 dias). */
async function actionRetryMedia(ctx: Ctx): Promise<Result> {
  const waId = waIdOf(ctx.body.waId)
  const messageId = msgIdOf(ctx.body.messageId)
  if (!waId || !messageId) return fail(400, 'MISSING_PARAMS')
  const wa = await requireConnected(ctx.storeId)
  if (isResult(wa)) return wa
  const mSnap = await convRef(ctx.storeId, waId).collection('messages').doc(messageId).get()
  const m = mSnap.data()
  if (!m) return fail(404, 'MESSAGE_NOT_FOUND')
  if (m.media?.url) return ok({ media: m.media })
  if (!m.media?.mediaId) return fail(400, 'NO_MEDIA')
  try {
    await archiveMedia(ctx.storeId, waId, messageId, { mediaId: m.media.mediaId, mimeType: m.media.mimeType || null, filename: m.media.filename || null }, m.type, wa.accessToken)
  } catch (e) {
    if (e instanceof MetaError) return metaFail(e)
    return fail(502, 'MEDIA_ARCHIVE_FAILED', { message: (e as Error).message })
  }
  const after = await mSnap.ref.get()
  return ok({ media: after.data()?.media || null })
}

// =================== BOT PROPIO (fase 3C) ===================

/**
 * Genera o rota el secreto de firma del webhook del bot. Se devuelve en claro
 * SOLO acá; después Configuración muestra "sfwhsec_…abcd" (botWebhookStatus.secretHint).
 */
async function actionBotWebhookSecret(ctx: Ctx): Promise<Result> {
  const r = await rotateBotSecret(ctx.storeId)
  return ok({ secret: r.secret, hint: r.hint, createdAt: r.createdAt })
}

/**
 * "Enviar prueba": manda un evento 'test' firmado a la URL GUARDADA (sin
 * reintentos) y devuelve el código HTTP. No suma al contador de fallos.
 */
async function actionBotWebhookTest(ctx: Ctx): Promise<Result> {
  const cfg = readBotWebhook((await waSettingsRef(ctx.storeId, 'automations').get()).data()?.botWebhook)
  if (!cfg.url) return fail(400, 'MISSING_URL')
  const checked = checkBotUrl(cfg.url)
  if ('error' in checked) return fail(400, checked.error)
  try {
    await assertPublicHost(checked.url)
  } catch (e) {
    return fail(400, (e as { code?: string }).code || 'DNS_ERROR')
  }
  const secret = await getBotSecret(ctx.storeId)
  if (!secret) return fail(409, 'NO_SECRET', { message: 'Genera el secreto de firma primero' })
  const now = new Date().toISOString()
  const payload: BotPayload = {
    id: newEventId(),
    type: 'test',
    storeId: ctx.storeId,
    createdAt: now,
    test: true,
    mode: cfg.mode,
    conversation: { waId: '5491100000000', phone: '5491100000000', name: 'Cliente de prueba', status: 'open', labels: [], aiPaused: false, optOut: false, windowExpiresAt: null },
    message: { id: 'wamid.TEST', direction: 'in', from: 'customer', type: 'text', text: 'Hola, esta es una prueba de Shopifree', timestamp: now },
    customer: { orders: { count: 0, lastOrderNumber: null, lastStatus: null } },
  }
  const r = await deliver(cfg.url, secret, payload, 0)
  await recordDelivery(ctx.storeId, 'test', r, false)
  return ok({ delivered: r.ok, status: r.status, error: r.error, durationMs: r.durationMs, response: r.text.slice(0, 300) })
}

// =================== HANDLER ===================

const ACTIONS: Record<string, (ctx: Ctx) => Promise<Result>> = {
  status: actionStatus,
  connect: actionConnect,
  'connect-manual': actionConnectManual,
  disconnect: actionDisconnect,
  'send-text': actionSendText,
  'send-media': actionSendMedia,
  'upload-url': actionUploadUrl,
  'mark-read': actionMarkRead,
  react: actionReact,
  'sync-templates': actionSyncTemplates,
  'send-template': actionSendTemplate,
  'retry-media': actionRetryMedia,
  'setup-order-templates': actionSetupOrderTemplates,
  'bot-webhook-secret': actionBotWebhookSecret,
  'bot-webhook-test': actionBotWebhookTest,
}

// Acciones que no exigen plan Business.
const NO_PLAN_ACTIONS = new Set(['status', 'disconnect', 'connect-manual'])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Body
  const action = String(body.action || '')
  const storeId = str(body.storeId, 128)
  const fn = Object.prototype.hasOwnProperty.call(ACTIONS, action) ? ACTIONS[action] : undefined
  if (!fn) return res.status(400).json({ error: 'INVALID_ACTION' })
  // Es id de documento: con '/' apuntaria a otra ruta de Firestore.
  if (!storeId || !/^[A-Za-z0-9_-]{1,128}$/.test(storeId)) return res.status(400).json({ error: 'MISSING_STORE' })

  try {
    getDb()
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
    const store = storeSnap.data() || {}
    const isAdmin = isAdminToken(decoded)
    if (store.ownerId !== decoded.uid && !isAdmin) return res.status(403).json({ error: 'FORBIDDEN' })

    if (!NO_PLAN_ACTIONS.has(action) && !isAdmin && !hasBusinessEffectivePlan(store as StorePlanData)) {
      return res.status(403).json({ error: 'PLAN_REQUIRED', message: 'ShopiChat requiere el plan Business' })
    }

    const result = await fn({ uid: decoded.uid, isAdmin, storeId, store, body })
    return res.status(result.status).json(result.data)
  } catch (err) {
    console.error(`[whatsapp] ${action} fallo:`, (err as Error).message)
    return res.status(500).json({ error: 'INTERNAL', message: 'Error interno' })
  }
}

// send-media puede bajar/subir archivos y generar miniaturas.
export const config = {
  maxDuration: 60,
}
