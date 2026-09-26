/**
 * ShopiChat — salud del token de WhatsApp de cada tienda.
 *
 * El token que se obtiene al canjear el code de Embedded Signup es un "business
 * integration system user access token". Segun la configuracion de Facebook
 * Login for Business puede no vencer nunca o vencer a los 60 dias (la nuestra:
 * 60 dias). Meta permite RENOVAR un token de system user que vence mientras
 * siga vigente (GET /oauth/access_token con grant_type=fb_exchange_token y
 * set_token_expires_in_60_days=true → otro token por 60 dias):
 * https://developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens
 *
 * Estrategia:
 *  1. Al conectar se inspecciona el token con /debug_token y se guarda
 *     tokenExpiresAt (null = no vence) y tokenType en private/whatsapp, y una
 *     copia no secreta (tokenExpiresAt, tokenStatus) en waSettings/account.
 *  2. El cron diario (api/send-email.ts) revisa todas las tiendas conectadas:
 *     si al token le quedan <= REFRESH_WITHIN_DAYS dias lo renueva solo. Si la
 *     renovacion falla y quedan <= WARN_WITHIN_DAYS, o si el token ya no es
 *     valido, marca tokenStatus 'expiring' | 'expired' y avisa al dueño UNA vez
 *     (mail + push; tokenAlertSentAt evita repetir). La UI muestra el banner
 *     "Reconectar WhatsApp".
 *  3. Si un envio falla con el error 190 de Meta (token invalido) se revisa en
 *     el momento con flagTokenError.
 *
 * Un token que no vence (expires_at 0, p. ej. el system user permanente de la
 * tienda de prueba del admin) queda con tokenExpiresAt null y nunca avisa ni se
 * renueva (renovarlo lo convertiria en uno de 60 dias).
 *
 * Nada de aca lanza: la salud del token nunca rompe un envio ni el cron.
 *
 * Env: META_APP_ID, META_APP_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL.
 */
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { Resend } from 'resend'
import { debugWhatsappToken, refreshWhatsappToken, isTokenInvalidError, type WaTokenInfo } from './whatsappGraph.js'
import { getDb, storeRef, privateWaRef, waSettingsRef, getPrivateWa, notifyOwner } from './whatsappInbox.js'

export type WaTokenStatus = 'ok' | 'expiring' | 'expired'

const DAY_MS = 24 * 60 * 60 * 1000
/** Con menos de estos dias se intenta renovar (el cron corre a diario: hay margen para reintentar). */
export const REFRESH_WITHIN_DAYS = 20
/** Con menos de estos dias (y sin poder renovar) se avisa al dueño. */
export const WARN_WITHIN_DAYS = 10

function appCreds(): { appId: string; appSecret: string } | null {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  return appId && appSecret ? { appId, appSecret } : null
}

/** debug_token del token; null si no se pudo preguntar (sin credenciales o Meta caido). */
export async function inspectToken(token: string): Promise<WaTokenInfo | null> {
  const creds = appCreds()
  if (!creds || !token) return null
  try {
    return await debugWhatsappToken({ ...creds, token })
  } catch (e) {
    console.warn('[wa-token] debug_token fallo:', (e as Error).message)
    return null
  }
}

export function statusFor(info: WaTokenInfo, now = Date.now()): WaTokenStatus {
  if (!info.isValid) return 'expired'
  if (info.expiresAt && info.expiresAt.getTime() - now <= WARN_WITHIN_DAYS * DAY_MS) return 'expiring'
  return 'ok'
}

/**
 * Campos a escribir despues de inspeccionar: los de private/whatsapp y la copia
 * no secreta de waSettings/account. Sin info (no se pudo preguntar) no se toca nada.
 */
export function tokenFields(info: WaTokenInfo | null): { priv: Record<string, unknown>; account: Record<string, unknown> } {
  if (!info) return { priv: {}, account: {} }
  const checkedAt = Timestamp.now()
  const tokenExpiresAt = info.expiresAt ? Timestamp.fromDate(info.expiresAt) : null
  const tokenStatus = statusFor(info)
  return {
    priv: { tokenExpiresAt, tokenType: info.type, tokenCheckedAt: checkedAt },
    account: {
      tokenExpiresAt,
      tokenStatus,
      tokenCheckedAt: checkedAt,
      // Todo en orden: el proximo problema vuelve a avisar.
      ...(tokenStatus === 'ok' ? { tokenAlertSentAt: FieldValue.delete() } : {}),
    },
  }
}

export interface TokenCheckResult {
  status: WaTokenStatus
  expiresAt: string | null
  type: string | null
  refreshed: boolean
}

/**
 * Revisa (y si corresponde renueva) el token de una tienda y guarda el estado.
 * null = la tienda no esta conectada o no se pudo preguntar a Meta.
 */
export async function checkStoreToken(storeId: string, opts: { refresh: boolean; notify: boolean }): Promise<TokenCheckResult | null> {
  try {
    const wa = await getPrivateWa(storeId)
    if (!wa) return null
    let info = await inspectToken(wa.accessToken)
    if (!info) return null

    let token = wa.accessToken
    let refreshed = false
    const creds = appCreds()
    if (
      opts.refresh && creds && info.isValid && info.expiresAt
      && info.expiresAt.getTime() - Date.now() <= REFRESH_WITHIN_DAYS * DAY_MS
    ) {
      try {
        const r = await refreshWhatsappToken({ ...creds, token })
        // Se confirma antes de guardarlo: nunca reemplazar un token que anda por uno que no.
        const again = await inspectToken(r.token)
        if (again?.isValid) {
          token = r.token
          info = again
          refreshed = true
          console.log(`[wa-token] ${storeId}: token renovado, vence ${again.expiresAt?.toISOString() ?? 'nunca'}`)
        }
      } catch (e) {
        console.warn(`[wa-token] ${storeId}: no se pudo renovar el token:`, (e as Error).message)
      }
    }

    const { priv, account } = tokenFields(info)
    const status = statusFor(info)
    const db = getDb()
    await db.runTransaction(async tx => {
      const snap = await tx.get(privateWaRef(storeId))
      // Si entremedio se reconecto o desconecto, no se pisa el token nuevo.
      if (!snap.exists || snap.data()?.accessToken !== wa.accessToken) return
      tx.update(privateWaRef(storeId), {
        ...priv,
        ...(refreshed ? { accessToken: token, tokenRefreshedAt: Timestamp.now() } : {}),
      })
      tx.set(waSettingsRef(storeId, 'account'), { ...account, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    })

    if (status !== 'ok' && opts.notify) await alertOwner(storeId, status, info.expiresAt)
    return { status, expiresAt: info.expiresAt?.toISOString() ?? null, type: info.type, refreshed }
  } catch (e) {
    console.error(`[wa-token] ${storeId}: revision fallo:`, (e as Error).message)
    return null
  }
}

/**
 * Un envio a Meta fallo: si fue por token invalido (190) se confirma con
 * debug_token y se avisa. Si no se puede confirmar, se marca 'expired' igual
 * (190 no deja dudas). Nunca lanza.
 */
export async function flagTokenError(storeId: string, e: unknown): Promise<void> {
  if (!storeId || !isTokenInvalidError(e)) return
  try {
    // Ya marcado y avisado: no se vuelve a preguntar a Meta en cada envio.
    const prev = (await waSettingsRef(storeId, 'account').get()).data()
    if (prev?.tokenStatus === 'expired' && prev?.tokenAlertSentAt) return
    const r = await checkStoreToken(storeId, { refresh: false, notify: true })
    if (r) return
    const acc = waSettingsRef(storeId, 'account')
    const cur = (await acc.get()).data()
    if (cur?.status !== 'connected') return
    await acc.set({ tokenStatus: 'expired', updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    await alertOwner(storeId, 'expired', null)
  } catch (err) {
    console.error(`[wa-token] ${storeId}: flagTokenError fallo:`, (err as Error).message)
  }
}

/** Cron: todas las tiendas con un numero conectado (waNumbers es el mapeo numero → tienda). */
export async function checkAllWhatsappTokens(): Promise<{ checked: number; refreshed: number; expiring: number; expired: number }> {
  const out = { checked: 0, refreshed: 0, expiring: 0, expired: 0 }
  if (!appCreds()) {
    console.warn('[wa-token] META_APP_ID / META_APP_SECRET no configurados — se omite la revision de tokens')
    return out
  }
  const snap = await getDb().collection('waNumbers').get()
  const storeIds = [...new Set(snap.docs.map(d => d.data()?.storeId).filter((s): s is string => typeof s === 'string' && !!s))]
  for (const storeId of storeIds) {
    const r = await checkStoreToken(storeId, { refresh: true, notify: true })
    if (!r) continue
    out.checked++
    if (r.refreshed) out.refreshed++
    if (r.status === 'expiring') out.expiring++
    if (r.status === 'expired') out.expired++
  }
  return out
}

// =================== AVISO AL DUEÑO ===================

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function tokenAlertEmail(storeName: string, status: Exclude<WaTokenStatus, 'ok'>, expiresAt: Date | null, lang: string) {
  const isEn = lang === 'en'
  const url = `https://shopifree.app/${isEn ? 'en' : 'es'}/dashboard/shopichat`
  const date = expiresAt
    ? expiresAt.toLocaleDateString(isEn ? 'en-US' : 'es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })
    : ''
  const lead = status === 'expired'
    ? (isEn
        ? `The WhatsApp connection of ${storeName} in ShopiChat has expired. Until you reconnect it, ShopiChat can't send messages or order notifications.`
        : `La conexión de WhatsApp de ${storeName} en ShopiChat se venció. Hasta que la reconectes, ShopiChat no puede enviar mensajes ni avisos de pedidos.`)
    : (isEn
        ? `The WhatsApp connection of ${storeName} in ShopiChat expires${date ? ` on ${date}` : ' soon'}.`
        : `La conexión de WhatsApp de ${storeName} en ShopiChat vence${date ? ` el ${date}` : ' pronto'}.`)
  const action = isEn
    ? 'Open ShopiChat from your computer and click "Reconnect WhatsApp". It takes a minute and your conversations stay as they are.'
    : 'Entra a ShopiChat desde tu computadora y toca «Reconectar WhatsApp». Toma un minuto y tus conversaciones se mantienen.'
  const subject = status === 'expired'
    ? (isEn ? 'Your WhatsApp is disconnected from ShopiChat' : 'Tu WhatsApp se desconectó de ShopiChat')
    : (isEn ? 'Reconnect your WhatsApp in ShopiChat' : 'Reconecta tu WhatsApp en ShopiChat')
  const text = `${isEn ? 'Hi,' : 'Hola,'}\n\n${lead}\n\n${action}\n${url}\n\n${isEn ? 'If you have questions, reply to this email.' : 'Si tienes dudas, responde este email.'}\n\n— Shopifree`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#333;line-height:1.6">
<div style="max-width:480px;margin:0 auto;padding:32px 16px">
  <p>${isEn ? 'Hi,' : 'Hola,'}</p>
  <p>${escapeHtml(lead)}</p>
  <p>${escapeHtml(action)}</p>
  <p><a href="${url}" style="color:#2563eb">${isEn ? 'Reconnect WhatsApp' : 'Reconectar WhatsApp'}</a></p>
  <p>${isEn ? 'If you have questions, reply to this email.' : 'Si tienes dudas, responde este email.'}</p>
  <p style="color:#999;margin-top:32px;font-size:12px">— Shopifree</p>
</div>
</body>
</html>`
  return { subject, text, html }
}

/**
 * Mail + push al dueño, UNA vez por problema: tokenAlertSentAt en
 * waSettings/account se reclama en transaccion (y se borra cuando el token
 * vuelve a estar bien o se reconecta).
 */
async function alertOwner(storeId: string, status: Exclude<WaTokenStatus, 'ok'>, expiresAt: Date | null): Promise<void> {
  const db = getDb()
  const acc = waSettingsRef(storeId, 'account')
  const claimed = await db.runTransaction(async tx => {
    const a = (await tx.get(acc)).data() || {}
    if (a.tokenAlertSentAt || a.status !== 'connected') return false
    tx.set(acc, { tokenAlertSentAt: FieldValue.serverTimestamp() }, { merge: true })
    return true
  })
  if (!claimed) return

  const store = (await storeRef(storeId).get()).data() || {}
  const lang = store.language === 'en' ? 'en' : 'es'
  const storeName = String(store.name || 'tu tienda')

  // Push (best effort; notifyOwner nunca lanza). waId vacio → abre ShopiChat.
  await notifyOwner(
    storeId, '',
    lang === 'en' ? 'Reconnect your WhatsApp' : 'Reconecta tu WhatsApp',
    status === 'expired'
      ? (lang === 'en' ? 'ShopiChat can no longer send messages. Reconnect it from your computer.' : 'ShopiChat ya no puede enviar mensajes. Reconéctalo desde tu computadora.')
      : (lang === 'en' ? 'Your WhatsApp connection expires soon. Reconnect it from your computer.' : 'La conexión de tu WhatsApp vence pronto. Reconéctala desde tu computadora.'),
  )

  // Mail al email de Firebase Auth del dueño (no users/{uid}.email, que lo escribe el cliente).
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[wa-token] RESEND_API_KEY no configurada, no se manda el mail')
    return
  }
  let ownerEmail = ''
  try {
    ownerEmail = store.ownerId ? (await getAuth().getUser(String(store.ownerId))).email || '' : ''
  } catch {
    ownerEmail = ''
  }
  if (!ownerEmail) return
  try {
    const email = tokenAlertEmail(storeName, status, expiresAt, lang)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Giacomo de Shopifree <hola@shopifree.app>'
    const { error } = await new Resend(apiKey).emails.send({ from: fromEmail, to: ownerEmail, subject: email.subject, html: email.html, text: email.text })
    if (error) throw new Error(error.message)
  } catch (e) {
    // Se suelta el reclamo para que el proximo cron lo reintente.
    console.error(`[wa-token] ${storeId}: mail de aviso fallo:`, (e as Error).message)
    await acc.set({ tokenAlertSentAt: FieldValue.delete() }, { merge: true }).catch(() => {})
  }
}
