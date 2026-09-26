/**
 * ShopiChat — piloto automático (fase 3B): la IA responde SOLA a los clientes.
 *
 * Lo dispara el webhook (api/whatsapp-webhook.ts) por cada mensaje nuevo del
 * cliente, después de guardarlo y fuera del 200 (waitUntil). Pasos:
 *
 *  1. Chequeo rápido: automations.ai prendido y en modo 'autopilot'.
 *  2. Espera AUTOPILOT_DEBOUNCE_MS (~12 s). Si mientras tanto el cliente
 *     escribió otro mensaje, este run se retira: el del mensaje más nuevo
 *     contesta todo junto.
 *  3. Condiciones (con datos frescos): plan Business, ventana de 24 h abierta,
 *     sin baja (optOut), conversación sin aiPaused, y ninguna respuesta humana
 *     (sentBy = uid del comerciante o 'phone') en los últimos 30 min.
 *  4. Horario (ai.hours): fuera de horario según ai.outsideHours → 'reply'
 *     (responde igual), 'away' (manda ai.awayMessage, máx. 1 cada 12 h por
 *     conversación) o 'silent' (no hace nada).
 *  5. Candado por conversación + mensaje (transacción sobre
 *     conversation.aiLastHandledMsgId): los reintentos del webhook no
 *     responden dos veces. En la misma transacción: máx.
 *     MAX_AI_REPLIES_PER_HOUR respuestas de IA por conversación por hora.
 *  6. Cupo diario de la tienda: IA incluida (200/día, compartido con el
 *     copiloto) o clave propia (2000/día).
 *  7. Genera con el motor (mismas herramientas de solo lectura + derivación).
 *  8. Antes de enviar vuelve a mirar: si entró otro mensaje, respondió una
 *     persona o pausaron la IA, no envía.
 *  9. Envía el texto y hasta 2 tarjetas de producto (solo productos que
 *     aparecieron en search_products de ESTA corrida), con sentBy 'ai'.
 *
 * Derivación (handoff_to_human o handoff=true): manda la nota de derivación
 * (ai.handoffNote o una por defecto), pausa la IA en la conversación
 * (aiPaused), la deja 'pending' con la etiqueta 'Atención humana', guarda el
 * motivo (aiHandoff) y avisa al dueño por push. El comerciante la reanuda
 * desde el chat (aiPaused=false).
 *
 * Errores del proveedor / de envío: no se reintenta; queda registrado en
 * automations.aiStatus para mostrarlo en Configuración.
 *
 * Fase 3C — "conecta tu propio bot": si automations.botWebhook está prendido
 * en modo 'bot', el bot externo REEMPLAZA al piloto (si los dos están
 * prendidos, gana el bot: blockedReason devuelve 'bot-mode'). runBotForMessage
 * le manda el evento message.received y aplica su respuesta síncrona con las
 * mismas reglas (candado aiLastHandledMsgId, tope por hora, ventana, baja,
 * pausa, persona activa) y sentBy 'bot'.
 */
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { hasBusinessEffectivePlan, type StorePlanData } from './plan.js'
import {
  getDb, storeRef, waSettingsRef, convRef, getPrivateWa, saveOutgoingMessage, notifyOwner, previewText,
  fetchProductImage, putObjectToR2, makeThumbnail, webpToJpeg, mediaKeyBase, r2PublicBase, getWaitUntil, type PrivateWa,
} from './whatsappInbox.js'
import { MEDIA_PERMITIDOS, MetaError, sendWhatsappText, sendWhatsappMedia, isSafeDocId } from './whatsappGraph.js'
import {
  HttpError, autopilotReply, claimQuota, oneLine, readAiSettings, recordUsage, storeUrl, toDate, withinHours, type AiSettings,
} from './shopichatAiEngine.js'
import { AiProviderError, ProviderSetupError, newUsage, resolveProvider, type AiProvider } from './aiProviders/index.js'
import { formatPrice } from '../../src/lib/currency.js'
import {
  botReplaces, conversationOut, customerSummaryOf, deliver, emitBotEvent, getBotSecret, loadBotConfig, messageOut, newEventId,
  readBotWebhook, recordDelivery, storeAllowsBot, type BotPayload, type BotWebhookConfig,
} from './shopichatBotWebhook.js'

export const AUTOPILOT_DEBOUNCE_MS = 12_000
/** Si una persona respondió hace menos de esto, la IA no se mete. */
const HUMAN_QUIET_MS = 30 * 60 * 1000
export const MAX_AI_REPLIES_PER_HOUR = 20
const AWAY_EVERY_MS = 12 * 60 * 60 * 1000
const MAX_CARDS = 2
export const AI_HANDOFF_LABEL = 'Atención humana'
const MAX_LABELS = 20
/** Una derivación por la API pública sobre una conversación ya derivada hace menos de esto no repite nota ni push. */
const HANDOFF_REPEAT_MS = 10 * 60 * 1000

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const ms = (v: unknown) => toDate(v)?.getTime() || 0

/** sentBy de un mensaje saliente que NO es de una persona. */
const isMachine = (sentBy: unknown) => sentBy === 'ai' || sentBy === 'auto' || sentBy === 'bot'

/** Quién manda: el piloto de Shopifree ('ai') o el bot del comerciante ('bot'). */
export type MachineSender = 'ai' | 'bot'

function defaultHandoffNote(store: DocumentData): string {
  return store.language === 'en'
    ? 'Thanks for your message! A member of our team will get back to you shortly. 🙌'
    : '¡Gracias por escribirnos! Una persona de nuestro equipo te responde en breve. 🙌'
}

/** Estado del piloto para Configuración (último error / última corrida). */
async function setStatus(storeId: string, patch: Record<string, unknown>) {
  await waSettingsRef(storeId, 'automations').set({ aiStatus: { ...patch, at: FieldValue.serverTimestamp() } }, { merge: true })
    .catch(() => {})
}

interface Snapshot {
  store: DocumentData
  ai: AiSettings
  bot: BotWebhookConfig
  conv: DocumentData
  recent: { id: string; data: DocumentData }[]
}

async function loadSnapshot(storeId: string, convId: string): Promise<Snapshot | null> {
  const cRef = convRef(storeId, convId)
  const [storeSnap, autoSnap, convSnap, msgs] = await Promise.all([
    storeRef(storeId).get(),
    waSettingsRef(storeId, 'automations').get(),
    cRef.get(),
    cRef.collection('messages').orderBy('timestamp', 'desc').limit(30).get(),
  ])
  if (!storeSnap.exists || !convSnap.exists) return null
  return {
    store: storeSnap.data() || {},
    ai: readAiSettings(autoSnap.data()?.ai),
    bot: readBotWebhook(autoSnap.data()?.botWebhook),
    conv: convSnap.data() || {},
    recent: msgs.docs.map(d => ({ id: d.id, data: d.data() })).filter(m => m.data.direction),
  }
}

/** Motivo por el que NO corresponde responder (null = sí corresponde). */
function blockedReason(s: Snapshot, messageId: string, now: number): string | null {
  if (!s.ai.enabled || s.ai.mode !== 'autopilot') return 'off'
  // Precedencia 3C: con el bot propio en modo 'bot', el piloto no responde.
  if (botReplaces(s.bot)) return 'bot-mode'
  if (!hasBusinessEffectivePlan(s.store as StorePlanData)) return 'plan'
  const latestIn = s.recent.find(m => m.data.direction === 'in')
  if (!latestIn || latestIn.id !== messageId) return 'newer-message'
  return sendBlockedReason(s, now)
}

/**
 * Lo común al piloto y al bot propio: ventana de 24 h, baja, pausa y una
 * persona respondiendo en los últimos 30 min.
 */
function sendBlockedReason(s: Pick<Snapshot, 'store' | 'conv' | 'recent'>, now: number): string | null {
  if (!hasBusinessEffectivePlan(s.store as StorePlanData)) return 'plan'
  if (ms(s.conv.windowExpiresAt) <= now) return 'window-closed'
  if (s.conv.optOut === true) return 'opt-out'
  if (s.conv.aiPaused === true) return 'paused'
  const humanRecent = s.recent.some(m => m.data.direction === 'out' && !isMachine(m.data.sentBy) && ms(m.data.timestamp) > now - HUMAN_QUIET_MS)
  if (humanRecent) return 'human-active'
  return null
}

/**
 * Candado por conversación + mensaje, y tope por hora. true = este run se
 * queda con el mensaje. `countsAsReply` suma al tope por hora.
 */
export async function acquireLock(storeId: string, convId: string, messageId: string, countsAsReply: boolean): Promise<boolean> {
  const cRef = convRef(storeId, convId)
  return getDb().runTransaction(async tx => {
    const c = (await tx.get(cRef)).data() || {}
    if (c.aiLastHandledMsgId === messageId) return false
    const now = Date.now()
    const hour = (c.aiHour && typeof c.aiHour === 'object' ? c.aiHour : {}) as { start?: number; count?: number }
    const sameHour = typeof hour.start === 'number' && now - hour.start < 60 * 60 * 1000
    const count = sameHour ? Number(hour.count) || 0 : 0
    if (countsAsReply && count >= MAX_AI_REPLIES_PER_HOUR) {
      tx.set(cRef, { aiLastHandledMsgId: messageId, aiRateLimitedAt: Timestamp.now() }, { merge: true })
      return false
    }
    tx.set(cRef, {
      aiLastHandledMsgId: messageId,
      aiLastHandledAt: Timestamp.now(),
      ...(countsAsReply ? { aiHour: { start: sameHour ? hour.start : now, count: count + 1 } } : {}),
    }, { merge: true })
    return true
  })
}

export async function sendAiText(
  storeId: string, convId: string, wa: PrivateWa, text: string,
  extra: Record<string, unknown> = {}, convUpdate: Record<string, unknown> = {}, by: MachineSender = 'ai',
): Promise<string> {
  const { waMessageId } = await sendWhatsappText({ token: wa.accessToken, phoneNumberId: wa.phoneNumberId, to: convId, text })
  await saveOutgoingMessage(storeId, convId, waMessageId, { type: 'text', text, status: 'sent', sentBy: by, ...extra }, {
    lastMessage: previewText('text', text),
    ...convUpdate,
  })
  return waMessageId
}

/** Texto de la tarjeta: *nombre* / precio (o rango) / link. */
function productCaption(store: DocumentData, p: DocumentData): string {
  const currency = String(store.currency || 'USD')
  const combos = (Array.isArray(p.combinations) ? p.combinations : []).filter((c: DocumentData) => c && c.available !== false)
  const base = Number(p.price) || 0
  const prices = combos.length ? combos.map((c: DocumentData) => (typeof c.price === 'number' ? c.price : base)) : [base]
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const price = min === max ? formatPrice(min, currency) : `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`
  return `*${oneLine(p.name, 80).replace(/\*/g, '')}*\n${price}\n${storeUrl(store)}/p/${encodeURIComponent(String(p.slug))}`
}

/**
 * Foto principal de un producto de ESTA tienda, si vive en nuestro R2 (mismo
 * criterio que productImageUrl de api/whatsapp.ts: https, mismo origen, sin
 * query). null si no hay una utilizable.
 */
function productCardImage(p: DocumentData): string | null {
  const raw = [p.image, ...(Array.isArray(p.images) ? p.images : [])].find(x => typeof x === 'string' && x)
  if (!raw) return null
  try {
    const u = new URL(raw as string)
    const base = new URL(`${r2PublicBase()}/`)
    if (u.protocol !== 'https:' || u.origin !== base.origin || u.search || u.hash) return null
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Manda un producto como tarjeta (foto + texto). Si no tiene foto usable, solo
 * el texto. Devuelve el wamid, o null si el producto no existe / no está activo.
 */
export async function sendProductCard(
  storeId: string, convId: string, wa: PrivateWa, store: DocumentData, productId: string, by: MachineSender = 'ai',
): Promise<string | null> {
  if (!isSafeDocId(productId) || productId.length > 128) return null
  const snap = await storeRef(storeId).collection('products').doc(productId).get()
  const p = snap.data()
  if (!p || p.active === false || !p.slug || !p.name) return null
  const caption = productCaption(store, p)
  const imageUrl = productCardImage(p)
  const max = MEDIA_PERMITIDOS['image/jpeg'].max
  const img = imageUrl ? await fetchProductImage(imageUrl, max) : null
  let buffer = img?.buffer || null
  let mimeType = img?.mimeType || ''
  if (buffer && mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
    buffer = await webpToJpeg(buffer)
    mimeType = 'image/jpeg'
  }
  if (!buffer || buffer.length > max) {
    return sendAiText(storeId, convId, wa, caption, { productId }, {}, by)
  }
  const base = mediaKeyBase(storeId, convId, `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const { url } = await putObjectToR2({ key: `${base}.${mimeType === 'image/png' ? 'png' : 'jpg'}`, body: buffer, contentType: mimeType })
  const thumb = await makeThumbnail({ buffer, key: `${base}_thumb.jpg` })
  const { waMessageId } = await sendWhatsappMedia({ token: wa.accessToken, phoneNumberId: wa.phoneNumberId, to: convId, type: 'image', link: url, caption })
  await saveOutgoingMessage(storeId, convId, waMessageId, {
    type: 'image',
    text: caption,
    media: { url, mimeType, ...(thumb || {}) },
    status: 'sent',
    sentBy: by,
    productId,
  }, { lastMessage: previewText('image', caption) })
  return waMessageId
}

/**
 * Deriva a una persona: nota al cliente (si `sendNote`), pausa, 'pending',
 * etiqueta, motivo y push. Avisa además al bot propio (conversation.handoff).
 */
async function handOff(
  storeId: string, convId: string, wa: PrivateWa | null,
  s: { store: DocumentData; conv: DocumentData; note: string },
  reason: string, by: MachineSender = 'ai', sendNote = true,
) {
  const labels: string[] = Array.isArray(s.conv.labels) ? s.conv.labels : []
  const withLabel = labels.includes(AI_HANDOFF_LABEL) ? labels : [...labels, AI_HANDOFF_LABEL].slice(-MAX_LABELS)
  const convUpdate = {
    aiPaused: true,
    status: 'pending',
    labels: withLabel,
    aiHandoff: { reason: oneLine(reason, 200), at: Timestamp.now(), by },
  }
  try {
    if (sendNote && wa) {
      await sendAiText(storeId, convId, wa, s.note || defaultHandoffNote(s.store), { aiHandoff: true }, convUpdate, by)
    } else {
      await convRef(storeId, convId).set(convUpdate, { merge: true })
    }
  } catch (e) {
    // Aunque no salga la nota, la conversación queda derivada.
    await convRef(storeId, convId).set(convUpdate, { merge: true })
    throw e
  } finally {
    const who = oneLine(s.conv.name, 60) || (s.conv.phone ? `+${s.conv.phone}` : 'WhatsApp')
    const en = s.store.language === 'en'
    await notifyOwner(storeId, convId, en ? `${who} needs a person` : `${who} necesita atención humana`, oneLine(reason, 160))
    // Al bot propio: fuera del camino (la API pública no espera sus reintentos).
    const emit = emitBotEvent(storeId, 'conversation.handoff', async () => ({
      conversation: conversationOut(convId, { ...s.conv, ...convUpdate }),
      handoff: { reason: oneLine(reason, 200), by },
    }))
    const waitUntil = getWaitUntil()
    if (waitUntil) waitUntil(emit)
    else await emit
  }
}

/**
 * Derivación pedida desde afuera (API pública POST /api/v1/whatsapp/handoff):
 * misma conducta que el piloto. La nota solo sale si la ventana está abierta
 * y el cliente no pidió la baja. Devuelve false si la conversación no existe.
 */
export async function handOffConversation(storeId: string, convId: string, reason: string, by: MachineSender): Promise<boolean> {
  const [storeSnap, autoSnap, convSnap] = await Promise.all([
    storeRef(storeId).get(), waSettingsRef(storeId, 'automations').get(), convRef(storeId, convId).get(),
  ])
  if (!convSnap.exists) return false
  const conv = convSnap.data() || {}
  // Idempotente: un bot que llama /handoff en cada mensaje del cliente no
  // puede spamear pushes al dueño ni notas al cliente.
  if (conv.aiPaused === true && ms(conv.aiHandoff?.at) > Date.now() - HANDOFF_REPEAT_MS) return true
  const store = storeSnap.data() || {}
  const canWrite = ms(conv.windowExpiresAt) > Date.now() && conv.optOut !== true
  const wa = canWrite ? await getPrivateWa(storeId) : null
  const note = readAiSettings(autoSnap.data()?.ai).handoffNote
  await handOff(storeId, convId, wa, { store, conv, note }, reason, by, !!wa)
  return true
}

/**
 * Punto de entrada (webhook, dentro de waitUntil). Nunca lanza: un fallo del
 * piloto no puede costar el mensaje ya guardado.
 */
export async function runAutopilot(storeId: string, convId: string, messageId: string): Promise<void> {
  try {
    await autopilot(storeId, convId, messageId)
  } catch (e) {
    console.error(`[shopichat-autopilot] ${storeId}/${convId} fallo:`, (e as Error).message)
  }
}

async function autopilot(storeId: string, convId: string, messageId: string) {
  // 1. Chequeo rápido antes de esperar (la mayoría de las tiendas no lo usa).
  const auto = (await waSettingsRef(storeId, 'automations').get()).data()
  const quick = readAiSettings(auto?.ai)
  if (!quick.enabled || quick.mode !== 'autopilot') return
  // Con el bot propio en modo 'bot', responde el bot (runBotForMessage).
  if (botReplaces(readBotWebhook(auto?.botWebhook))) return

  // 2. Debounce: si el cliente sigue escribiendo, contesta el run del último mensaje.
  await sleep(AUTOPILOT_DEBOUNCE_MS)

  // 3. Condiciones con datos frescos.
  const s = await loadSnapshot(storeId, convId)
  if (!s) return
  const blocked = blockedReason(s, messageId, Date.now())
  if (blocked) {
    if (blocked !== 'off' && blocked !== 'newer-message') console.log(`[shopichat-autopilot] ${convId}: no responde (${blocked})`)
    return
  }
  const wa = await getPrivateWa(storeId)
  if (!wa) return

  // 4. Horario.
  if (!withinHours(s.ai.hours)) {
    if (s.ai.outsideHours === 'silent') return
    if (s.ai.outsideHours === 'away') {
      if (!s.ai.awayMessage || ms(s.conv.aiAwaySentAt) > Date.now() - AWAY_EVERY_MS) return
      if (!(await acquireLock(storeId, convId, messageId, true))) return
      try {
        await sendAiText(storeId, convId, wa, s.ai.awayMessage, { aiAway: true }, { aiAwaySentAt: Timestamp.now() })
      } catch (e) {
        await setStatus(storeId, { lastError: e instanceof MetaError ? 'META_ERROR' : 'SEND_ERROR' })
        throw e
      }
      return
    }
  }

  // 5. Candado + tope por hora.
  if (!(await acquireLock(storeId, convId, messageId, true))) return

  // 6. Proveedor y cupo.
  let provider: AiProvider
  try {
    provider = await resolveProvider(storeId, s.ai.provider)
  } catch (e) {
    if (e instanceof ProviderSetupError) {
      await setStatus(storeId, { lastError: e.message })
      return
    }
    throw e
  }
  try {
    await claimQuota(storeId, 'autopilot', provider.byo)
  } catch (e) {
    if (e instanceof HttpError && e.message === 'LIMIT_REACHED') {
      await setStatus(storeId, { lastError: 'LIMIT_REACHED' })
      return
    }
    throw e
  }

  // 7. Generar.
  const usage = newUsage()
  let result
  try {
    result = await autopilotReply(provider, { storeId, store: s.store, ai: s.ai, waId: convId, conv: s.conv }, usage)
  } catch (e) {
    await recordUsage(storeId, usage, true, provider.byo)
    const code = e instanceof AiProviderError ? e.code : e instanceof HttpError ? e.message : 'INTERNAL'
    await setStatus(storeId, { lastError: code, provider: provider.id })
    console.warn(`[shopichat-autopilot] ${convId}: el modelo fallo (${code})`)
    return
  }
  await recordUsage(storeId, usage, false, provider.byo)

  // 8. ¿Sigue correspondiendo? (entró otro mensaje, respondió una persona, pausaron la IA)
  const again = await loadSnapshot(storeId, convId)
  if (!again) return
  const stillBlocked = blockedReason(again, messageId, Date.now())
  if (stillBlocked) {
    console.log(`[shopichat-autopilot] ${convId}: se descarta la respuesta (${stillBlocked})`)
    return
  }

  // 9. Enviar.
  try {
    if (result.handoff) {
      await handOff(storeId, convId, wa, { store: again.store, conv: again.conv, note: again.ai.handoffNote }, result.handoff)
    } else {
      await sendAiText(storeId, convId, wa, result.reply)
      for (const id of result.productIds.slice(0, MAX_CARDS)) {
        await sendProductCard(storeId, convId, wa, s.store, id).catch(e => {
          console.warn(`[shopichat-autopilot] tarjeta ${id} no enviada:`, (e as Error).message)
        })
      }
    }
    await convRef(storeId, convId).set({ aiReplyCount: FieldValue.increment(1), aiLastReplyAt: Timestamp.now() }, { merge: true })
    await setStatus(storeId, { lastError: null, lastReplyProvider: provider.id })
  } catch (e) {
    await setStatus(storeId, { lastError: e instanceof MetaError ? 'META_ERROR' : 'SEND_ERROR' })
    throw e
  }
}

// =================== BOT PROPIO (fase 3C) ===================

/** Cuánto se espera a que el adjunto quede en R2 para mandar su URL al bot. */
const BOT_MEDIA_WAIT_MS = 6_000
const BOT_MAX_TEXT = 4096

/** El mensaje entrante, esperando (acotado) a que su adjunto quede archivado. */
async function waitForMedia(storeId: string, convId: string, messageId: string): Promise<DocumentData | null> {
  const ref = convRef(storeId, convId).collection('messages').doc(messageId)
  const until = Date.now() + BOT_MEDIA_WAIT_MS
  let m = (await ref.get()).data() || null
  while (m?.media && !m.media.url && !m.media.archiveError && Date.now() < until) {
    await sleep(750)
    m = (await ref.get()).data() || null
  }
  return m
}

interface BotReply { text: string; productIds: string[]; handoff: string | null }

/** Respuesta síncrona del bot: { reply?: { text?, productIds? }, handoff?: { reason } }. */
function parseBotReply(json: unknown): BotReply | null {
  if (!json || typeof json !== 'object') return null
  const j = json as Record<string, unknown>
  const reply = j.reply && typeof j.reply === 'object' ? (j.reply as Record<string, unknown>) : null
  const text = typeof reply?.text === 'string' ? reply.text.trim().slice(0, BOT_MAX_TEXT) : ''
  const ids = (Array.isArray(reply?.productIds) ? (reply.productIds as unknown[]) : [])
    .filter((x): x is string => typeof x === 'string' && isSafeDocId(x) && x.length <= 128)
  const h = j.handoff && typeof j.handoff === 'object' ? (j.handoff as Record<string, unknown>) : null
  const handoff = h ? oneLine(h.reason, 200) || 'Derivado por el bot' : null
  const productIds = [...new Set(ids)].slice(0, MAX_CARDS)
  if (!text && !productIds.length && !handoff) return null
  return { text, productIds, handoff }
}

/**
 * Evento message.received al bot propio (webhook, dentro de waitUntil).
 *
 *  - Modo 'notify': solo avisa (si el evento está marcado).
 *  - Modo 'bot': avisa SIEMPRE (con expectsReply) y, si el bot contesta en el
 *    cuerpo de la respuesta (dentro de los 5 s), lo aplica con las mismas
 *    reglas que el piloto: datos frescos, ventana, baja, pausa, persona
 *    activa, candado por mensaje y tope por hora. Si el bot prefiere contestar
 *    después, usa la API pública (api/v1/whatsapp).
 *
 * Nunca lanza.
 */
export async function runBotForMessage(storeId: string, convId: string, messageId: string): Promise<void> {
  try {
    await botForMessage(storeId, convId, messageId)
  } catch (e) {
    console.error(`[shopichat-bot] ${storeId}/${convId} fallo:`, (e as Error).message)
  }
}

async function botForMessage(storeId: string, convId: string, messageId: string) {
  const cfg = await loadBotConfig(storeId)
  if (!cfg.enabled || !cfg.url) return
  const botMode = cfg.mode === 'bot'
  if (!botMode && !cfg.events.includes('message.received')) return
  if (!(await storeAllowsBot(storeId))) return
  const secret = await getBotSecret(storeId)
  if (!secret) return

  const m = await waitForMedia(storeId, convId, messageId)
  if (!m || m.direction !== 'in') return
  const s = await loadSnapshot(storeId, convId)
  if (!s) return
  const blocked = botMode ? sendBlockedReason(s, Date.now()) : null
  const payload: BotPayload = {
    id: newEventId(),
    type: 'message.received',
    storeId,
    createdAt: new Date().toISOString(),
    mode: cfg.mode,
    expectsReply: botMode && !blocked,
    ...(blocked ? { replyBlockedReason: blocked } : {}),
    conversation: conversationOut(convId, s.conv),
    message: messageOut(messageId, m),
    customer: await customerSummaryOf(storeId, convId, s.conv.phone),
  }
  const r = await deliver(cfg.url, secret, payload)
  if (!r.ok) console.warn(`[shopichat-bot] ${storeId}: message.received no entregado (${r.error})`)
  await recordDelivery(storeId, 'message.received', r)
  if (!botMode || !r.ok) return
  const reply = parseBotReply(r.json)
  if (!reply) return

  // ¿Sigue correspondiendo? (datos frescos: pudo responder una persona, pausarse o apagarse el bot)
  const again = await loadSnapshot(storeId, convId)
  if (!again || !botReplaces(again.bot)) return
  const stillBlocked = sendBlockedReason(again, Date.now())
  if (stillBlocked) {
    console.log(`[shopichat-bot] ${convId}: se descarta la respuesta del bot (${stillBlocked})`)
    return
  }
  const wa = await getPrivateWa(storeId)
  if (!wa) return
  if (!(await acquireLock(storeId, convId, messageId, true))) return

  if (reply.handoff) {
    // Si el bot mandó texto junto con la derivación, ese texto es la nota.
    await handOff(storeId, convId, wa, { store: again.store, conv: again.conv, note: reply.text || again.ai.handoffNote }, reply.handoff, 'bot')
    return
  }
  if (reply.text) await sendAiText(storeId, convId, wa, reply.text, {}, {}, 'bot')
  for (const id of reply.productIds) {
    await sendProductCard(storeId, convId, wa, again.store, id, 'bot').catch(e => {
      console.warn(`[shopichat-bot] tarjeta ${id} no enviada:`, (e as Error).message)
    })
  }
  await convRef(storeId, convId).set({ botReplyCount: FieldValue.increment(1), botLastReplyAt: Timestamp.now() }, { merge: true })
}
