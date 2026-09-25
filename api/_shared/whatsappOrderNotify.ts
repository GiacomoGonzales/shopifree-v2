/**
 * ShopiChat — avisos automaticos de pedidos por WhatsApp (fase 2C).
 *
 * Aca vive todo lo que NO es transporte:
 *  - las plantillas UTILITY que se crean en la WABA de cada tienda (es / en),
 *  - que evento usa que plantilla y con que valores,
 *  - la creacion de las que falten (accion 'setup-order-templates' de
 *    api/whatsapp.ts, y automaticamente despues de conectar),
 *  - el telefono del cliente en formato de WhatsApp.
 *
 * El envio lo hace api/whatsapp-notify.ts (lo llama la Cloud Function
 * onOrderWriteWhatsapp / waPaymentReminders de functions/src/index.ts).
 *
 * Reglas de Meta que respetan los textos: categoria UTILITY (transaccional,
 * nada promocional), variables posicionales {{1}}..{{n}} sin saltos, nunca al
 * principio ni al final del cuerpo ni pegadas entre si, y un ejemplo por
 * variable. Los valores enviados no pueden tener saltos de linea ni tabs.
 */

import { FieldValue } from 'firebase-admin/firestore'
import { formatPrice } from '../../src/lib/currency.js'
import { createWhatsappTemplate, listWhatsappTemplates, MetaError, type WaTemplate } from './whatsappGraph.js'
import { waSettingsRef } from './whatsappInbox.js'

// =================== EVENTOS ===================

export const ORDER_EVENTS = ['received', 'confirmed', 'shipped', 'readyForPickup', 'delivered', 'paymentReminder'] as const
export type OrderEvent = typeof ORDER_EVENTS[number]
export const isOrderEvent = (v: unknown): v is OrderEvent => (ORDER_EVENTS as readonly string[]).includes(String(v))

/** Evento → nombre de la plantilla en la WABA (el mismo en los dos idiomas). */
export const EVENT_TEMPLATE: Record<OrderEvent, string> = {
  received: 'pedido_recibido',
  confirmed: 'pedido_confirmado',
  shipped: 'pedido_en_camino',
  readyForPickup: 'pedido_listo_para_recoger',
  delivered: 'pedido_entregado',
  paymentReminder: 'recordatorio_pago',
}

/** stores/{id}/waSettings/automations.orderNotifications */
export interface OrderNotificationsConfig {
  received?: boolean
  confirmed?: boolean
  shipped?: boolean
  readyForPickup?: boolean
  delivered?: boolean
  paymentReminder?: { enabled?: boolean; delayHours?: number }
}

export function isEventEnabled(cfg: OrderNotificationsConfig | null | undefined, event: OrderEvent): boolean {
  if (!cfg) return false
  if (event === 'paymentReminder') return cfg.paymentReminder?.enabled === true
  return cfg[event] === true
}

// =================== PLANTILLAS ===================

export type TemplateLang = 'es' | 'en'
export const templateLangOf = (storeLanguage: unknown): TemplateLang =>
  String(storeLanguage || '').toLowerCase().startsWith('en') ? 'en' : 'es'

interface TemplateDef {
  body: string
  /** Un ejemplo por variable, en orden. */
  examples: string[]
}

/**
 * Textos de las plantillas. Variables:
 *  {{1}} primer nombre, {{2}} numero de pedido, {{3}} tienda,
 *  {{4}} total (recibido / recordatorio) o detalle del envio (en camino),
 *  {{5}} link de pago (recordatorio).
 */
export const ORDER_TEMPLATES: Record<TemplateLang, Record<OrderEvent, TemplateDef>> = {
  es: {
    received: {
      body: 'Hola {{1}}, recibimos tu pedido {{2}} en {{3}} por un total de {{4}}. Te avisaremos por aquí cuando cambie su estado. ¡Gracias por tu compra!',
      examples: ['María', 'ORD-1024', 'Tienda Ejemplo', 'S/120.00'],
    },
    confirmed: {
      body: 'Hola {{1}}, tu pedido {{2}} en {{3}} fue confirmado y ya lo estamos preparando. Te avisaremos cuando esté listo.',
      examples: ['María', 'ORD-1024', 'Tienda Ejemplo'],
    },
    shipped: {
      body: 'Hola {{1}}, tu pedido {{2}} de {{3}} ya está en camino. {{4}} Si tienes alguna duda, responde a este mensaje.',
      examples: ['María', 'ORD-1024', 'Tienda Ejemplo', 'Número de seguimiento: 1Z999AA10123456784 (DHL).'],
    },
    readyForPickup: {
      body: 'Hola {{1}}, tu pedido {{2}} ya está listo para recoger en {{3}}. ¡Te esperamos!',
      examples: ['María', 'ORD-1024', 'Tienda Ejemplo'],
    },
    delivered: {
      body: 'Hola {{1}}, tu pedido {{2}} de {{3}} fue entregado. ¡Gracias por tu compra! Si algo no está bien, responde a este mensaje.',
      examples: ['María', 'ORD-1024', 'Tienda Ejemplo'],
    },
    paymentReminder: {
      body: 'Hola {{1}}, tu pedido {{2}} en {{3}} por {{4}} sigue pendiente de pago. Puedes pagarlo aquí: {{5}} Si ya pagaste, ignora este mensaje.',
      examples: ['María', 'ORD-1024', 'Tienda Ejemplo', 'S/120.00', 'https://tienda.shopifree.app/pay/abc123/xyz789'],
    },
  },
  en: {
    received: {
      body: 'Hi {{1}}, we received your order {{2}} at {{3}} for a total of {{4}}. We will keep you posted here when its status changes. Thank you for your purchase!',
      examples: ['Mary', 'ORD-1024', 'Example Store', '$120.00'],
    },
    confirmed: {
      body: 'Hi {{1}}, your order {{2}} at {{3}} has been confirmed and we are preparing it. We will let you know when it is ready.',
      examples: ['Mary', 'ORD-1024', 'Example Store'],
    },
    shipped: {
      body: 'Hi {{1}}, your order {{2}} from {{3}} is on its way. {{4}} If you have any questions, just reply to this message.',
      examples: ['Mary', 'ORD-1024', 'Example Store', 'Tracking number: 1Z999AA10123456784 (DHL).'],
    },
    readyForPickup: {
      body: 'Hi {{1}}, your order {{2}} is ready for pickup at {{3}}. See you soon!',
      examples: ['Mary', 'ORD-1024', 'Example Store'],
    },
    delivered: {
      body: 'Hi {{1}}, your order {{2}} from {{3}} has been delivered. Thank you for your purchase! If anything is wrong, just reply to this message.',
      examples: ['Mary', 'ORD-1024', 'Example Store'],
    },
    paymentReminder: {
      body: 'Hi {{1}}, your order {{2}} at {{3}} for {{4}} is still pending payment. You can pay it here: {{5}} If you already paid, please ignore this message.',
      examples: ['Mary', 'ORD-1024', 'Example Store', '$120.00', 'https://store.shopifree.app/pay/abc123/xyz789'],
    },
  },
}

const TEXTS: Record<TemplateLang, { customer: string; tracking: string; noTracking: string }> = {
  es: {
    customer: 'cliente',
    tracking: 'Número de seguimiento:',
    noTracking: 'Pronto llegará a la dirección que nos indicaste.',
  },
  en: {
    customer: 'there',
    tracking: 'Tracking number:',
    noTracking: 'It will arrive soon at the address you gave us.',
  },
}

/** Cantidad de {{n}} del cuerpo de una plantilla sincronizada. */
export function bodyVarCount(t: WaTemplate): number {
  const body = (t.components as { type?: string; text?: string }[]).find(c => c?.type === 'BODY')
  const found = new Set((body?.text || '').match(/\{\{\s*\d+\s*\}\}/g) || [])
  return found.size
}

/**
 * La plantilla de un evento en el catalogo sincronizado: primero la del idioma
 * de la tienda, si no la otra (el comerciante pudo cambiar el idioma despues
 * de crearlas).
 */
export function pickEventTemplate(items: WaTemplate[], event: OrderEvent, lang: TemplateLang): WaTemplate | null {
  const name = EVENT_TEMPLATE[event]
  const same = items.filter(t => t.name === name)
  const langOf = (t: WaTemplate) => (t.language.toLowerCase().startsWith('en') ? 'en' : 'es')
  return same.find(t => langOf(t) === lang && t.status === 'APPROVED')
    || same.find(t => t.status === 'APPROVED')
    || same.find(t => langOf(t) === lang)
    || same[0]
    || null
}

// =================== VALORES ===================

/** Sin saltos de linea, tabs ni 4+ espacios (Meta rechaza el envio). */
export const cleanParam = (v: unknown, max = 200) =>
  String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

export interface OrderLike {
  orderNumber?: string
  customer?: { name?: string; phone?: string } | null
  total?: number
  trackingNumber?: string
  trackingCarrier?: string
}

/** Link publico de pago (fase 2B): mismo formato que payLinkFor de src/components/shopichat/sell.ts. */
export function payLinkOf(store: Record<string, unknown>, storeId: string, orderId: string): string {
  const base = store.customDomain ? `https://${String(store.customDomain)}` : `https://${String(store.subdomain || '')}.shopifree.app`
  return `${base}/pay/${encodeURIComponent(storeId)}/${encodeURIComponent(orderId)}`
}

/** Valores {{1}}..{{n}} de la plantilla del evento, en el idioma de la plantilla. */
export function templateValues(p: {
  event: OrderEvent; lang: TemplateLang; store: Record<string, unknown>; order: OrderLike; payLink?: string | null
}): string[] {
  const tx = TEXTS[p.lang]
  const first = cleanParam(p.order.customer?.name, 60).split(' ')[0] || tx.customer
  const number = cleanParam(p.order.orderNumber, 40) || '-'
  const storeName = cleanParam(p.store.name, 80) || 'Shopifree'
  const total = formatPrice(Number(p.order.total) || 0, String(p.store.currency || 'USD'))
  switch (p.event) {
    case 'received':
      return [first, number, storeName, total]
    case 'shipped': {
      const tracking = cleanParam(p.order.trackingNumber, 80)
      const carrier = cleanParam(p.order.trackingCarrier, 40)
      const detail = tracking ? `${tx.tracking} ${tracking}${carrier ? ` (${carrier})` : ''}.` : tx.noTracking
      return [first, number, storeName, detail]
    }
    case 'paymentReminder':
      return [first, number, storeName, total, cleanParam(p.payLink, 300)]
    default:
      return [first, number, storeName]
  }
}

// =================== TELEFONO ===================

/**
 * Codigo telefonico por pais de la tienda (store.location.country). Copia
 * server-side de phoneCodeByCountry (src/data/states.ts): ese modulo no se
 * puede importar desde api/.
 */
const PHONE_CODES: Record<string, string> = {
  PE: '51', CO: '57', AR: '54', CL: '56', EC: '593', BO: '591', PY: '595', UY: '598', VE: '58', BR: '55',
  MX: '52', GT: '502', HN: '504', SV: '503', NI: '505', CR: '506', PA: '507', DO: '1', US: '1', ES: '34',
}

/**
 * Telefono del pedido en formato de WhatsApp (solo digitos con codigo de
 * pais). Misma regla que toWhatsAppDigits (src/lib/customerKey.ts): si se
 * guardo sin codigo de pais se le antepone el del pais de la tienda. null si
 * no parece un numero.
 */
export function orderPhoneToWaId(phone: unknown, storeCountry: unknown): string | null {
  let d = String(phone || '').replace(/\D/g, '').replace(/^00/, '')
  if (!d) return null
  const cc = PHONE_CODES[String(storeCountry || '').toUpperCase()] || ''
  if (cc && !(d.startsWith(cc) && d.length - cc.length >= 8) && d.length <= 10) {
    d = `${cc}${d.replace(/^0+/, '')}`
  }
  if (d.length < 8 || d.length > 15) return null
  return d
}

// =================== CREAR LAS QUE FALTAN ===================

export interface SetupResult {
  language: TemplateLang
  created: string[]
  existing: { name: string; status: string }[]
  errors: { name: string; message: string }[]
  items: WaTemplate[]
}

/**
 * Crea en la WABA las plantillas de avisos que falten (en el idioma de la
 * tienda) y vuelve a sincronizar el catalogo en waSettings/templates. Una
 * que ya existe con ese nombre e idioma no se toca (aunque este rechazada: se
 * revisa/edita en el administrador de WhatsApp de Meta).
 */
export async function setupOrderTemplates(p: { storeId: string; token: string; wabaId: string; storeLanguage: unknown }): Promise<SetupResult> {
  const lang = templateLangOf(p.storeLanguage)
  const before = await listWhatsappTemplates({ token: p.token, wabaId: p.wabaId })
  const out: SetupResult = { language: lang, created: [], existing: [], errors: [], items: before }

  for (const event of ORDER_EVENTS) {
    const name = EVENT_TEMPLATE[event]
    const prev = before.find(t => t.name === name && (t.language.toLowerCase().startsWith('en') ? 'en' : 'es') === lang)
    if (prev) {
      out.existing.push({ name, status: prev.status })
      continue
    }
    const def = ORDER_TEMPLATES[lang][event]
    try {
      await createWhatsappTemplate({
        token: p.token, wabaId: p.wabaId, name, language: lang, category: 'UTILITY',
        body: def.body, bodyExamples: def.examples,
      })
      out.created.push(name)
    } catch (e) {
      const message = e instanceof MetaError ? (e.metaDetails || e.message) : String((e as Error)?.message || e)
      out.errors.push({ name, message: message.slice(0, 300) })
    }
  }

  const items = out.created.length ? await listWhatsappTemplates({ token: p.token, wabaId: p.wabaId }) : before
  await waSettingsRef(p.storeId, 'templates').set({ items, syncedAt: FieldValue.serverTimestamp() })
  out.items = items
  return out
}
