import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { hasBusinessEffectivePlan, type StorePlanData } from './_shared/plan.js'
import { MetaError, isValidWaId, renderTemplateText, sendWhatsappTemplate, type WaTemplate } from './_shared/whatsappGraph.js'
import { getDb, storeRef, convRef, waSettingsRef, getPrivateWa, saveOutgoingMessage, previewText } from './_shared/whatsappInbox.js'
import {
  EVENT_TEMPLATE, isOrderEvent, isEventEnabled, pickEventTemplate, bodyVarCount, templateLangOf, templateValues,
  payLinkOf, orderPhoneToWaId, type OrderEvent, type OrderNotificationsConfig, type TemplateLang,
} from './_shared/whatsappOrderNotify.js'

/**
 * ShopiChat — avisos automaticos de pedidos (fase 2C).
 *
 * POST { storeId, orderId, event } con Authorization: Bearer <WHATSAPP_NOTIFY_SECRET>.
 * Lo llaman SOLO las Cloud Functions (functions/src/index.ts):
 *  - onOrderWriteWhatsapp: received / confirmed / shipped / readyForPickup / delivered
 *  - waPaymentReminders (cada 30 min): paymentReminder
 *
 * Toda la logica de WhatsApp vive aca (las Functions no tienen el token ni
 * hablan con Meta). Chequeos, en orden:
 *  1. secreto (comparacion en tiempo constante);
 *  2. tienda con plan Business efectivo y ShopiChat conectado;
 *  3. el aviso de ese evento prendido (waSettings/automations.orderNotifications);
 *  4. el pedido: no de prueba, no cancelado, y lo propio de cada evento;
 *  5. telefono del cliente → waId (con el codigo de pais de la tienda si falta);
 *  6. el contacto no pidio la baja;
 *  7. plantilla del evento APROBADA y con la cantidad de variables esperada;
 *  8. idempotencia: waNotified.{event} del pedido se reclama en una
 *     transaccion ANTES de mandar. Si ya estaba, no se manda. Si Meta falla,
 *     el reclamo queda (nunca se manda dos veces) y el error se guarda en
 *     waNotifyErrors.{event}.
 * Despues se manda la plantilla y se guarda como saliente en la conversacion
 * (sentBy 'auto'), creandola si no existe.
 *
 * Responde 200 { ok, sent } o 200 { ok, skipped: <motivo> } para todo lo que
 * es "no corresponde avisar" (asi la Function no reintenta), 401 sin secreto,
 * 400 con parametros invalidos y 502 si Meta rechazo el envio.
 *
 * Env: WHATSAPP_NOTIFY_SECRET, FIREBASE_*.
 */

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const ONLINE = new Set(['mercadopago', 'stripe', 'paypal', 'gocuotas'])

/** Compara el Bearer con el secreto en tiempo constante (hash para igualar largos). */
function validSecret(header: string | undefined): boolean {
  const secret = process.env.WHATSAPP_NOTIFY_SECRET
  if (!secret || secret.length < 16) return false
  const got = String(header || '').startsWith('Bearer ') ? String(header).slice(7) : ''
  if (!got) return false
  const a = crypto.createHash('sha256').update(got).digest()
  const b = crypto.createHash('sha256').update(secret).digest()
  return crypto.timingSafeEqual(a, b)
}

type Skip = { skipped: string }
const skip = (reason: string): Skip => ({ skipped: reason })

/** ¿Sigue teniendo sentido el aviso con el pedido como esta AHORA? */
function orderAllows(event: OrderEvent, o: Record<string, unknown>, store: Record<string, unknown>): string | null {
  if (o.isTest === true) return 'test_order'
  if (o.status === 'cancelled') return 'cancelled'
  switch (event) {
    case 'received':
      // Ventas cargadas a mano (POS / "Nueva venta"): no se le escribe al
      // cliente, salvo las que nacieron en un chat (ShopiChat, canal whatsapp).
      if (o.manual === true && o.channel !== 'whatsapp') return 'manual_order'
      return null
    case 'paymentReminder': {
      if (o.paymentStatus && o.paymentStatus !== 'pending') return 'not_pending_payment'
      const method = String(o.paymentMethod || '')
      if (!ONLINE.has(method)) return 'offline_method'
      const payments = (store.payments || {}) as Record<string, { enabled?: boolean } | undefined>
      if (!payments[method]?.enabled) return 'method_disabled'
      return null
    }
    default:
      return null
  }
}

async function notify(storeId: string, orderId: string, event: OrderEvent): Promise<{ sent: true; messageId: string; waId: string } | Skip> {
  const db = getDb()
  const sRef = storeRef(storeId)
  const oRef = sRef.collection('orders').doc(orderId)
  const [storeSnap, orderSnap, autoSnap, tplSnap] = await Promise.all([
    sRef.get(), oRef.get(), waSettingsRef(storeId, 'automations').get(), waSettingsRef(storeId, 'templates').get(),
  ])
  if (!storeSnap.exists) return skip('store_not_found')
  if (!orderSnap.exists) return skip('order_not_found')
  const store = storeSnap.data() || {}
  const order = orderSnap.data() || {}

  if (!hasBusinessEffectivePlan(store as StorePlanData)) return skip('plan_required')
  const cfg = autoSnap.data()?.orderNotifications as OrderNotificationsConfig | undefined
  if (!isEventEnabled(cfg, event)) return skip('disabled')
  if ((order.waNotified as Record<string, unknown> | undefined)?.[event]) return skip('already_notified')
  const notAllowed = orderAllows(event, order, store)
  if (notAllowed) return skip(notAllowed)

  const wa = await getPrivateWa(storeId)
  if (!wa) return skip('not_connected')

  // A quien: el chat del que salio el pedido (ShopiChat) o el telefono del cliente.
  const customer = (order.customer || {}) as { name?: string; phone?: string }
  const fromChat = typeof order.waId === 'string' && isValidWaId(order.waId) ? order.waId : null
  const storeCountry = (store.location as { country?: string } | undefined)?.country
  const waId = fromChat || orderPhoneToWaId(customer.phone, storeCountry)
  if (!waId || !isValidWaId(waId)) return skip('no_phone')

  const cRef = convRef(storeId, waId)
  const cSnap = await cRef.get()
  if (cSnap.data()?.optOut === true) return skip('opted_out')

  // Plantilla del evento: tiene que estar APROBADA y tener las variables
  // que armamos (si el comerciante tenia otra con el mismo nombre, no se usa).
  const lang: TemplateLang = templateLangOf(store.language)
  const template = pickEventTemplate((tplSnap.data()?.items as WaTemplate[]) || [], event, lang)
  if (!template) return skip('template_missing')
  if (template.status !== 'APPROVED') return skip('template_not_approved')
  const tplLang: TemplateLang = template.language.toLowerCase().startsWith('en') ? 'en' : 'es'

  const payLink = event === 'paymentReminder' ? payLinkOf(store, storeId, orderId) : null
  const values = templateValues({ event, lang: tplLang, store, order, payLink })
  if (bodyVarCount(template) !== values.length) return skip('template_mismatch')

  // Reclamo idempotente: dos llamadas simultaneas (reintento, doble trigger)
  // no pueden mandar las dos.
  const claimed = await db.runTransaction(async tx => {
    const snap = await tx.get(oRef)
    const d = snap.data() || {}
    if ((d.waNotified as Record<string, unknown> | undefined)?.[event]) return false
    const update: Record<string, unknown> = { [`waNotified.${event}`]: Timestamp.now() }
    // El recordatorio lleva el link publico de pago: sin payLinkAt no abre.
    if (event === 'paymentReminder' && !d.payLinkAt) update.payLinkAt = Timestamp.now()
    tx.update(oRef, update)
    return true
  })
  if (!claimed) return skip('already_notified')

  let waMessageId: string
  try {
    ({ waMessageId } = await sendWhatsappTemplate({
      token: wa.accessToken, phoneNumberId: wa.phoneNumberId, to: waId,
      name: template.name, language: template.language, bodyValues: values,
    }))
  } catch (e) {
    const message = e instanceof MetaError ? (e.metaDetails || e.message) : String((e as Error)?.message || e)
    await oRef.update({ [`waNotifyErrors.${event}`]: { message: message.slice(0, 300), at: Timestamp.now() } }).catch(() => {})
    throw e
  }

  const text = renderTemplateText(template.components, values)
  const convDefaults = cSnap.exists ? {} : {
    waId, phone: /^\d+$/.test(waId) ? waId : null, name: customer.name ? String(customer.name).slice(0, 80) : null,
    labels: [], note: '', optOut: false, status: 'open', windowExpiresAt: null, createdAt: FieldValue.serverTimestamp(),
  }
  await saveOutgoingMessage(storeId, waId, waMessageId, {
    type: 'template',
    text,
    template: { name: template.name, language: template.language },
    status: 'sent',
    sentBy: 'auto',
    orderId,
    orderEvent: event,
  }, { ...convDefaults, lastMessage: previewText('template', text), lastTemplateAt: Timestamp.now() })

  return { sent: true, messageId: waMessageId, waId }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!validSecret(req.headers.authorization)) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
  const storeId = String(body.storeId || '')
  const orderId = String(body.orderId || '')
  const event = body.event
  // Son ids de documento: con '/' apuntarian a otra ruta de Firestore.
  if (!ID_RE.test(storeId) || !ID_RE.test(orderId) || !isOrderEvent(event)) {
    return res.status(400).json({ error: 'INVALID_PARAMS' })
  }

  try {
    const r = await notify(storeId, orderId, event)
    if ('skipped' in r) console.log(`[whatsapp-notify] ${storeId}/${orderId} ${event}: ${r.skipped}`)
    else console.log(`[whatsapp-notify] ${storeId}/${orderId} ${event} → ${EVENT_TEMPLATE[event]} enviado`)
    return res.status(200).json({ ok: true, ...r })
  } catch (err) {
    if (err instanceof MetaError) {
      console.warn(`[whatsapp-notify] ${storeId}/${orderId} ${event}: Meta rechazo el envio:`, err.metaDetails || err.message)
      return res.status(502).json({ error: 'META_ERROR', message: err.metaDetails || err.message, metaCode: err.metaCode })
    }
    console.error(`[whatsapp-notify] ${storeId}/${orderId} ${event} fallo:`, (err as Error).message)
    return res.status(500).json({ error: 'INTERNAL' })
  }
}

export const config = {
  maxDuration: 30,
}
