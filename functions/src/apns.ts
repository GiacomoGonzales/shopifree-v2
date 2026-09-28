import http2 from 'http2'
import { sign } from 'crypto'

/**
 * Envío directo a APNs para los dispositivos iOS.
 *
 * Las apps de iOS (la principal y las de cada tienda) no usan Firebase: el
 * plugin de Capacitor entrega el device token de Apple, que FCM no acepta. Se
 * manda con la clave .p8 del equipo, que sirve para todos los bundle ids, así
 * que una tienda nueva no necesita configuración propia: el `topic` de cada
 * envío es el bundle id que la app mandó al registrar el token.
 *
 * Gemelo de api/_shared/apns.ts (las Cloud Functions no pueden importar de
 * api/). Si cambiás uno, cambiá el otro.
 *
 * Env: APNS_KEY_ID, APNS_KEY (contenido del .p8), APPLE_TEAM_ID. En Functions
 * son secretos (defineSecret en index.ts) y llegan como process.env.
 */

export interface ApnsTarget {
  token: string
  /** Bundle id de la app que registró el token. */
  topic: string
}

export interface ApnsMessage {
  title: string
  body: string
  /** Claves extra del payload; la app las recibe en `notification.data`. */
  data?: Record<string, string>
}

export interface ApnsResult {
  ok: boolean
  /** El token ya no sirve (app desinstalada, token de otra app): borrarlo. */
  stale: boolean
  reason?: string
}

// Producción: TestFlight y App Store. Los tokens de builds de Xcode (sandbox)
// dan BadDeviceToken acá y se limpian como vencidos.
const APNS_HOST = 'https://api.push.apple.com'
const STALE_REASONS = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'])
const CONCURRENCY = 100
const REQUEST_TIMEOUT_MS = 10_000

let cachedJwt: { iat: number; token: string } | null = null

function providerToken(): string {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APPLE_TEAM_ID
  const key = process.env.APNS_KEY?.replace(/\\n/g, '\n')
  if (!keyId || !teamId || !key) throw new Error('Missing APNS_KEY_ID, APNS_KEY or APPLE_TEAM_ID')

  // Apple rechaza el token si se renueva más seguido que cada 20 minutos
  // (TooManyProviderTokenUpdates) y lo da por vencido a la hora. Con el iat
  // redondeado a la media hora, todas las instancias firman con el mismo iat
  // y cada una lo reusa hasta que cambia la franja.
  const iat = Math.floor(Date.now() / 1000 / 1800) * 1800
  if (cachedJwt?.iat === iat) return cachedJwt.token

  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${encode({ alg: 'ES256', kid: keyId })}.${encode({ iss: teamId, iat })}`
  const signature = sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' })
  const token = `${unsigned}.${signature.toString('base64url')}`
  cachedJwt = { iat, token }
  return token
}

function sendOne(
  session: http2.ClientHttp2Session,
  jwt: string,
  target: ApnsTarget,
  payload: string
): Promise<ApnsResult> {
  return new Promise(resolve => {
    let settled = false
    const done = (result: ApnsResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    if (!/^[0-9a-fA-F]{64,200}$/.test(target.token)) {
      return done({ ok: false, stale: true, reason: 'MalformedToken' })
    }

    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${target.token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': target.topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    })

    let status = 0
    let body = ''
    req.setEncoding('utf8')
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      done({ ok: false, stale: false, reason: 'Timeout' })
      req.close(http2.constants.NGHTTP2_CANCEL)
    })
    req.on('response', headers => { status = Number(headers[':status']) })
    req.on('data', (chunk: string) => { body += chunk })
    req.on('end', () => {
      if (status === 200) return done({ ok: true, stale: false })
      let reason = `HTTP ${status}`
      try {
        reason = (JSON.parse(body) as { reason?: string }).reason || reason
      } catch {
        // cuerpo vacío o no JSON: queda el código HTTP
      }
      done({ ok: false, stale: status === 410 || STALE_REASONS.has(reason), reason })
    })
    req.on('error', err => done({ ok: false, stale: false, reason: err.message }))
    req.on('close', () => done({ ok: false, stale: false, reason: 'StreamClosed' }))
    req.end(payload)
  })
}

/**
 * Manda la notificación a cada target. Devuelve un resultado por target, en el
 * mismo orden. Lanza solo si faltan las credenciales.
 */
export async function sendApns(targets: ApnsTarget[], message: ApnsMessage): Promise<ApnsResult[]> {
  if (targets.length === 0) return []
  const jwt = providerToken()
  const payload = JSON.stringify({
    ...message.data,
    aps: { alert: { title: message.title, body: message.body }, sound: 'default' },
  })

  const session = http2.connect(APNS_HOST)
  // Los errores de conexión llegan también a cada pedido; sin este handler
  // tirarían el proceso.
  session.on('error', err => console.error('[apns] Session error:', err.message))

  try {
    const results: ApnsResult[] = []
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const chunk = targets.slice(i, i + CONCURRENCY)
      results.push(...await Promise.all(chunk.map(t => sendOne(session, jwt, t, payload))))
    }
    return results
  } finally {
    session.close()
  }
}
