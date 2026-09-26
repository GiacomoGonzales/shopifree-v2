/**
 * ShopiChat — "conecta tu propio bot" (fase 3C): webhooks salientes.
 *
 * El comerciante configura en stores/{id}/waSettings/automations.botWebhook:
 *   { enabled, url (https), events: ['message.received'|'message.status'|
 *     'conversation.handoff'], mode: 'notify' | 'bot' }
 * El secreto de firma vive en stores/{id}/private/botWebhook { secret,
 * createdAt } (solo servidor; se muestra UNA vez al crearlo/rotarlo desde
 * api/whatsapp 'bot-webhook-secret').
 *
 * Cada evento es un POST JSON con:
 *   X-Shopifree-Signature: t=<unix>,v1=<hex hmac-sha256(secret, `${t}.${body}`)>
 *   X-Shopifree-Event:     <tipo>
 *   X-Shopifree-Delivery:  <id del evento> (el mismo en los reintentos)
 *
 * Entrega: timeout de 5 s por intento, 2 reintentos con espera (1 s y 3 s)
 * solo ante errores de red, timeout, 408, 429 o 5xx. Todo corre dentro del
 * waitUntil del webhook de Meta. El resultado queda en
 * automations.botWebhookStatus.lastDelivery; con AUTO_DISABLE_AFTER fallos
 * seguidos se apaga solo (botWebhook.enabled=false + autoDisabledAt) y
 * Configuración muestra el aviso.
 *
 * SSRF: solo https, sin usuario/clave en la URL, y la IP se valida en el
 * momento de conectar (lookup propio de https.request), así un DNS que
 * cambia entre la validación y la conexión (rebinding) tampoco llega a una
 * red privada. No se siguen redirecciones.
 *
 * Modo 'bot' (el bot RESPONDE): ver runBotForMessage en shopichatAutopilot.ts.
 */
import crypto from 'crypto'
import dns from 'dns'
import net from 'net'
import https from 'https'
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { getDb, storeRef, waSettingsRef } from './whatsappInbox.js'
import { hasBusinessEffectivePlan, type StorePlanData } from './plan.js'
import { customerOrders } from './shopichatAiEngine.js'

// =================== CONFIG ===================

export const BOT_EVENTS = ['message.received', 'message.status', 'conversation.handoff'] as const
export type BotEvent = (typeof BOT_EVENTS)[number]
export type BotMode = 'notify' | 'bot'

export interface BotWebhookConfig {
  enabled: boolean
  url: string
  events: BotEvent[]
  mode: BotMode
}

export const DELIVERY_TIMEOUT_MS = 5_000
export const RETRY_DELAYS_MS = [1_000, 3_000]
/** Fallos seguidos (ya contando reintentos) antes de apagar el webhook solo. */
export const AUTO_DISABLE_AFTER = 20
const MAX_RESPONSE_BYTES = 64 * 1024
const MAX_URL_CHARS = 2000
const CONFIG_CACHE_MS = 5_000

export const botSecretRef = (storeId: string) => storeRef(storeId).collection('private').doc('botWebhook')

export function readBotWebhook(raw: unknown): BotWebhookConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const events = (Array.isArray(r.events) ? r.events : []).filter((e): e is BotEvent => BOT_EVENTS.includes(e as BotEvent))
  return {
    enabled: r.enabled === true,
    url: typeof r.url === 'string' ? r.url.trim().slice(0, MAX_URL_CHARS) : '',
    events: [...new Set(events)],
    mode: r.mode === 'bot' ? 'bot' : 'notify',
  }
}

/** ¿El bot reemplaza al piloto automático? (si los dos están prendidos, gana el bot) */
export const botReplaces = (cfg: BotWebhookConfig) => cfg.enabled && !!cfg.url && cfg.mode === 'bot'

const cache = new Map<string, { at: number; cfg: BotWebhookConfig }>()

/** Config con caché corta (una ráfaga de estados no relee el doc cada vez). */
export async function loadBotConfig(storeId: string, fresh = false): Promise<BotWebhookConfig> {
  const hit = cache.get(storeId)
  if (!fresh && hit && Date.now() - hit.at < CONFIG_CACHE_MS) return hit.cfg
  const cfg = readBotWebhook((await waSettingsRef(storeId, 'automations').get()).data()?.botWebhook)
  cache.set(storeId, { at: Date.now(), cfg })
  return cfg
}

export async function getBotSecret(storeId: string): Promise<string | null> {
  const s = (await botSecretRef(storeId).get()).data()?.secret
  return typeof s === 'string' && s ? s : null
}

/** Genera (o rota) el secreto. Devuelve el secreto en claro: se muestra UNA vez. */
export async function rotateBotSecret(storeId: string): Promise<{ secret: string; hint: string; createdAt: string }> {
  const secret = `sfwhsec_${crypto.randomBytes(32).toString('hex')}`
  const hint = `sfwhsec_…${secret.slice(-4)}`
  const now = Timestamp.now()
  await botSecretRef(storeId).set({ secret, createdAt: now })
  await waSettingsRef(storeId, 'automations').set({ botWebhookStatus: { secretHint: hint, secretCreatedAt: now } }, { merge: true })
  return { secret, hint, createdAt: now.toDate().toISOString() }
}

// =================== SSRF ===================

const blocked = new net.BlockList()
for (const [ip, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blocked.addSubnet(ip, bits, 'ipv4')
for (const [ip, bits] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64],
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
] as const) blocked.addSubnet(ip, bits, 'ipv6')

/** ¿IP pública (ni privada, ni loopback, ni link-local, ni reservada)? */
export function isPublicIp(ip: string): boolean {
  const family = net.isIP(ip)
  if (!family) return false
  if (family === 6) {
    // Forma canónica (WHATWG) para no depender de cómo venga escrita
    // (ceros de más, hex vs. punto decimal, mayúsculas).
    let canon: string
    try { canon = new URL(`http://[${ip}]/`).hostname.slice(1, -1).toLowerCase() } catch { return false }
    // IPv4 mapeada (::ffff:a.b.c.d) o compatible (::a.b.c.d, ::/96, deprecada):
    // no hay endpoint legítimo así. Va aparte porque una regla ::ffff:0:0/96
    // en BlockList también bloquea IPv4.
    if (canon.startsWith('::ffff:') || /^::([0-9a-f]{1,4}(:[0-9a-f]{1,4})?)?$/.test(canon)) return false
    return !blocked.check(canon, 'ipv6')
  }
  return !blocked.check(ip, 'ipv4')
}

const stripBrackets = (h: string) => h.replace(/^\[|\]$/g, '')

/**
 * Validación de forma (sin DNS): https, sin credenciales, host con punto o
 * IP pública literal, nada de localhost. Devuelve la URL normalizada o un código.
 */
export function checkBotUrl(raw: unknown): { url: URL } | { error: string } {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s || s.length > MAX_URL_CHARS) return { error: 'INVALID_URL' }
  let u: URL
  try { u = new URL(s) } catch { return { error: 'INVALID_URL' } }
  if (u.protocol !== 'https:') return { error: 'HTTPS_REQUIRED' }
  if (u.username || u.password) return { error: 'INVALID_URL' }
  // Sin el punto final ("localhost." = "localhost"). Igual la IP se vuelve a
  // validar al conectar (guardedLookup).
  const host = stripBrackets(u.hostname).toLowerCase().replace(/\.+$/, '')
  if (net.isIP(host)) return isPublicIp(host) ? { url: u } : { error: 'PRIVATE_ADDRESS' }
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return { error: 'PRIVATE_ADDRESS' }
  }
  return { url: u }
}

class DeliveryError extends Error {
  constructor(public code: string) { super(code) }
}

/** lookup para https.request: resuelve y rechaza si CUALQUIER dirección es privada. */
function guardedLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, '')
    const list = addresses as dns.LookupAddress[]
    if (!list.length || list.some(a => !isPublicIp(a.address))) {
      const e = new DeliveryError('PRIVATE_ADDRESS') as unknown as NodeJS.ErrnoException
      return callback(e, '')
    }
    if (options.all) return callback(null, list)
    callback(null, list[0].address, list[0].family)
  })
}

/** Resuelve el host y confirma que es público (para el botón "Enviar prueba"). */
export async function assertPublicHost(u: URL): Promise<void> {
  const host = stripBrackets(u.hostname)
  if (net.isIP(host)) {
    if (!isPublicIp(host)) throw new DeliveryError('PRIVATE_ADDRESS')
    return
  }
  let list: dns.LookupAddress[]
  try {
    list = await dns.promises.lookup(host, { all: true, verbatim: true })
  } catch {
    throw new DeliveryError('DNS_ERROR')
  }
  if (!list.length || list.some(a => !isPublicIp(a.address))) throw new DeliveryError('PRIVATE_ADDRESS')
}

interface HttpResult { status: number; text: string }

function postOnce(u: URL, body: string, headers: Record<string, string>, timeoutMs: number): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (fn: () => void) => { if (!settled) { settled = true; clearTimeout(timer); fn() } }
    const req = https.request({
      protocol: 'https:',
      hostname: stripBrackets(u.hostname),
      servername: net.isIP(stripBrackets(u.hostname)) ? undefined : stripBrackets(u.hostname),
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method: 'POST',
      lookup: guardedLookup as unknown as net.LookupFunction,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body)),
        'User-Agent': 'Shopifree-Webhooks/1.0',
      },
    }, res => {
      const chunks: Buffer[] = []
      let size = 0
      const finish = () => done(() => resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString('utf8') }))
      res.on('data', (c: Buffer) => {
        size += c.length
        if (size <= MAX_RESPONSE_BYTES) chunks.push(c)
        else { finish(); res.destroy() }
      })
      res.on('end', finish)
      res.on('error', e => done(() => reject(e)))
    })
    // Plazo TOTAL del intento (conexión + respuesta), no solo inactividad.
    const timer = setTimeout(() => {
      done(() => reject(new DeliveryError('TIMEOUT')))
      req.destroy()
    }, timeoutMs)
    req.on('error', e => done(() => reject(e)))
    req.end(body)
  })
}

// =================== FIRMA ===================

export function signBody(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')
  return `t=${t},v1=${v1}`
}

// =================== ENTREGA ===================

export interface BotPayload {
  id: string
  type: BotEvent | 'test'
  storeId: string
  createdAt: string
  [k: string]: unknown
}

export interface DeliveryResult {
  ok: boolean
  status: number
  error: string | null
  durationMs: number
  attempts: number
  /** Cuerpo de la respuesta (acotado) si fue JSON. */
  json: unknown | null
  text: string
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const retryable = (status: number) => status === 408 || status === 429 || status >= 500

export const newEventId = () => `evt_${crypto.randomBytes(12).toString('hex')}`

function errorCode(e: unknown): string {
  if (e instanceof DeliveryError) return e.code
  const code = (e as NodeJS.ErrnoException)?.code || ''
  if (code === 'PRIVATE_ADDRESS') return 'PRIVATE_ADDRESS'
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'DNS_ERROR'
  if (/CERT|SSL|TLS/i.test(code)) return 'TLS_ERROR'
  return 'CONNECTION_ERROR'
}

/** POST firmado con reintentos. Nunca lanza. */
export async function deliver(url: string, secret: string, payload: BotPayload, retries = RETRY_DELAYS_MS.length): Promise<DeliveryResult> {
  const started = Date.now()
  const checked = checkBotUrl(url)
  const base = { durationMs: 0, attempts: 0, json: null, text: '' }
  if ('error' in checked) return { ...base, ok: false, status: 0, error: checked.error }
  const body = JSON.stringify(payload)
  let last: DeliveryResult = { ...base, ok: false, status: 0, error: 'NOT_SENT' }
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 3_000)
    try {
      const r = await postOnce(checked.url, body, {
        'X-Shopifree-Signature': signBody(secret, body),
        'X-Shopifree-Event': payload.type,
        'X-Shopifree-Delivery': payload.id,
        'X-Shopifree-Attempt': String(attempt + 1),
      }, DELIVERY_TIMEOUT_MS)
      let json: unknown = null
      if (r.text) { try { json = JSON.parse(r.text) } catch { /* no es JSON: se ignora */ } }
      const ok = r.status >= 200 && r.status < 300
      last = { ok, status: r.status, error: ok ? null : `HTTP_${r.status}`, durationMs: Date.now() - started, attempts: attempt + 1, json, text: r.text.slice(0, 500) }
      if (ok || !retryable(r.status)) return last
    } catch (e) {
      const code = errorCode(e)
      last = { ...base, ok: false, status: 0, error: code, durationMs: Date.now() - started, attempts: attempt + 1 }
      if (code === 'PRIVATE_ADDRESS' || code === 'INVALID_URL') return last
    }
  }
  return last
}

// =================== ESTADO ===================

/**
 * Guarda el resultado en automations.botWebhookStatus y, si corresponde, apaga
 * el webhook tras AUTO_DISABLE_AFTER fallos seguidos. Los éxitos repetidos se
 * escriben como mucho una vez por minuto (una ráfaga de estados no martilla el doc).
 * `countFailures=false` (envío de prueba): registra, pero no suma al contador.
 */
export async function recordDelivery(storeId: string, type: string, r: DeliveryResult, countFailures = true): Promise<void> {
  const ref = waSettingsRef(storeId, 'automations')
  try {
    const prev = (await ref.get()).data()?.botWebhookStatus || {}
    const prevAt = (prev.lastDelivery?.at as Timestamp | undefined)?.toMillis?.() || 0
    if (r.ok && countFailures && prev.lastDelivery?.ok === true && !prev.consecutiveFailures && Date.now() - prevAt < 60_000) return
    await getDb().runTransaction(async tx => {
      const data = (await tx.get(ref)).data() || {}
      const cur = data.botWebhookStatus || {}
      const lastDelivery = {
        at: Timestamp.now(), event: type, ok: r.ok, status: r.status, error: r.error, durationMs: r.durationMs, attempts: r.attempts,
      }
      const status: Record<string, unknown> = { lastDelivery }
      if (r.ok) {
        status.consecutiveFailures = 0
        status.autoDisabledAt = FieldValue.delete()
      } else if (countFailures) {
        const failures = (Number(cur.consecutiveFailures) || 0) + 1
        const cfg = readBotWebhook(data.botWebhook)
        if (failures >= AUTO_DISABLE_AFTER && cfg.enabled) {
          status.consecutiveFailures = 0
          status.autoDisabledAt = Timestamp.now()
          tx.set(ref, { botWebhook: { enabled: false }, botWebhookStatus: status }, { merge: true })
          cache.delete(storeId)
          console.warn(`[shopichat-bot] ${storeId}: webhook apagado tras ${failures} fallos seguidos`)
          return
        }
        status.consecutiveFailures = failures
      }
      tx.set(ref, { botWebhookStatus: status }, { merge: true })
    })
  } catch (e) {
    console.warn(`[shopichat-bot] ${storeId}: no se pudo guardar el estado:`, (e as Error).message)
  }
}

// =================== PAYLOAD ===================

const iso = (v: unknown): string | null => {
  const d = v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : null
  return d ? d.toISOString() : null
}

export function conversationOut(waId: string, c: DocumentData) {
  return {
    waId,
    phone: typeof c.phone === 'string' ? c.phone : null,
    name: typeof c.name === 'string' ? c.name : null,
    status: typeof c.status === 'string' ? c.status : 'open',
    labels: Array.isArray(c.labels) ? c.labels.filter((l: unknown) => typeof l === 'string') : [],
    aiPaused: c.aiPaused === true,
    optOut: c.optOut === true,
    windowExpiresAt: iso(c.windowExpiresAt),
  }
}

/** Quién mandó un saliente, sin exponer el uid del comerciante. */
export function senderOf(m: DocumentData): 'customer' | 'human' | 'ai' | 'bot' | 'auto' {
  if (m.direction === 'in') return 'customer'
  if (m.sentBy === 'ai' || m.sentBy === 'bot' || m.sentBy === 'auto') return m.sentBy
  return 'human'
}

export function messageOut(id: string, m: DocumentData) {
  const media = m.media && typeof m.media === 'object' && typeof m.media.url === 'string'
    ? { url: m.media.url as string, mimeType: (m.media.mimeType as string) || null, filename: (m.media.filename as string) || null }
    : null
  return {
    id,
    direction: m.direction === 'out' ? 'out' : 'in',
    from: senderOf(m),
    type: typeof m.type === 'string' ? m.type : 'text',
    text: typeof m.text === 'string' ? m.text : '',
    ...(media ? { media } : {}),
    timestamp: iso(m.timestamp),
    ...(m.direction === 'out' && m.status ? { status: m.status } : {}),
  }
}

/** Resumen mínimo de pedidos del cliente (por teléfono o creados desde este chat). */
export async function customerSummaryOf(storeId: string, waId: string, phone: unknown) {
  const orders = await customerOrders(storeId, waId, typeof phone === 'string' ? phone : '').catch(() => [] as DocumentData[])
  const last = orders[0]
  return {
    orders: {
      count: orders.length,
      lastOrderNumber: last?.orderNumber != null ? String(last.orderNumber) : null,
      lastStatus: typeof last?.status === 'string' ? last.status : null,
    },
  }
}

/** ¿La tienda puede usar el webhook? (ShopiChat es del plan Business) */
export async function storeAllowsBot(storeId: string): Promise<DocumentData | null> {
  const store = (await storeRef(storeId).get()).data()
  return store && hasBusinessEffectivePlan(store as StorePlanData) ? store : null
}

/**
 * Evento "solo aviso" (message.status, conversation.handoff, o
 * message.received en modo 'notify'). Nunca lanza. `build` arma el resto del
 * payload solo si de verdad hay que enviar.
 */
export async function emitBotEvent(storeId: string, type: BotEvent, build: () => Promise<Record<string, unknown> | null>): Promise<void> {
  try {
    const cfg = await loadBotConfig(storeId)
    if (!cfg.enabled || !cfg.url || !cfg.events.includes(type)) return
    if (!(await storeAllowsBot(storeId))) return
    const secret = await getBotSecret(storeId)
    if (!secret) return
    const extra = await build()
    if (!extra) return
    const payload: BotPayload = { id: newEventId(), type, storeId, createdAt: new Date().toISOString(), ...extra }
    const r = await deliver(cfg.url, secret, payload)
    if (!r.ok) console.warn(`[shopichat-bot] ${storeId}: ${type} no entregado (${r.error})`)
    await recordDelivery(storeId, type, r)
  } catch (e) {
    console.warn(`[shopichat-bot] ${storeId}: ${type} fallo:`, (e as Error).message)
  }
}
