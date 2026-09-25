import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { verifyWhatsappSignature, parseWhatsappWebhook, type WaAccountRef } from './_shared/whatsappGraph.js'
import {
  getDb, saveIncomingMessage, saveIncomingReaction, applyStatus, applyContactSyncs, saveUnprocessed, getWaitUntil,
} from './_shared/whatsappInbox.js'

/**
 * ShopiChat — webhook de la WhatsApp Cloud API (multi-tienda).
 *
 * URL que se carga en Meta: https://shopifree.app/api/whatsapp-webhook
 *
 * GET  → verificacion de Meta (hub.challenge vs WHATSAPP_VERIFY_TOKEN).
 * POST → eventos. Es PUBLICO: lo unico que separa un evento real de uno
 *        inventado es la firma X-Hub-Signature-256 (HMAC con META_APP_SECRET)
 *        sobre el cuerpo CRUDO. Por eso bodyParser va desactivado.
 *
 * Ruteo: cada change trae metadata.phone_number_id → waNumbers/{id} → storeId.
 * Numeros desconocidos se loguean y se ignoran.
 *
 * A Meta se le responde 200 SIEMPRE que la firma sea valida, aunque guardar
 * falle: un webhook que devuelve error entra en reintentos y, si insiste, Meta
 * lo da de baja. Lo que falla queda en waUnprocessed.
 *
 * Lo lento (bajar adjuntos a R2, miniaturas, push) va despues del 200 con
 * waitUntil de Vercel cuando el runtime lo expone; si no, se espera con un
 * presupuesto de tiempo antes de responder.
 *
 * Env: META_APP_SECRET, WHATSAPP_VERIFY_TOKEN, FIREBASE_*, R2_*.
 */

// Presupuesto para el trabajo diferido cuando NO hay waitUntil.
const FOLLOWUP_BUDGET_MS = 8_000

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** phoneNumberId (o, si no viene, wabaId) → storeId. Cacheado por request. */
function makeResolver() {
  const cache = new Map<string, string | null>()
  return async (account: WaAccountRef): Promise<string | null> => {
    const key = account.phoneNumberId ? `p:${account.phoneNumberId}` : account.wabaId ? `w:${account.wabaId}` : ''
    if (!key) return null
    if (cache.has(key)) return cache.get(key)!
    let storeId: string | null = null
    if (account.phoneNumberId) {
      const snap = await getDb().collection('waNumbers').doc(account.phoneNumberId).get()
      storeId = (snap.data()?.storeId as string) || null
    } else if (account.wabaId) {
      // Algunos eventos de coexistencia pueden venir sin metadata: se usa la WABA.
      const q = await getDb().collection('waNumbers').where('wabaId', '==', account.wabaId).limit(1).get()
      storeId = (q.docs[0]?.data()?.storeId as string) || null
    }
    cache.set(key, storeId)
    if (!storeId) {
      console.warn(`[whatsapp-webhook] Numero sin tienda, se ignora: phoneNumberId=${account.phoneNumberId || '-'} waba=${account.wabaId || '-'}`)
    }
    return storeId
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------- Verificacion (GET) ----------
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    const expected = process.env.WHATSAPP_VERIFY_TOKEN
    const a = Buffer.from(typeof token === 'string' ? token : '')
    const b = Buffer.from(expected || '')
    const tokenOk = !!expected && a.length === b.length && crypto.timingSafeEqual(a, b)
    if (mode === 'subscribe' && tokenOk) {
      // Meta espera el desafio en texto plano.
      res.setHeader('Content-Type', 'text/plain')
      return res.status(200).send(String(challenge ?? ''))
    }
    console.warn('[whatsapp-webhook] Verificacion rechazada')
    return res.status(403).send('Forbidden')
  }

  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  // ---------- Firma ----------
  let rawBody: Buffer
  try {
    rawBody = await getRawBody(req)
  } catch {
    return res.status(400).send('Bad request')
  }
  const signature = req.headers['x-hub-signature-256']
  if (!verifyWhatsappSignature(rawBody, Array.isArray(signature) ? signature[0] : signature, process.env.META_APP_SECRET)) {
    // Diagnostico sin exponer secretos.
    console.warn('[whatsapp-webhook] Firma invalida', JSON.stringify({
      cabeceraPresente: !!signature,
      claveConfigurada: !!process.env.META_APP_SECRET,
      largoCuerpo: rawBody.length,
    }))
    return res.status(401).send('Invalid signature')
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody.toString('utf8'))
  } catch {
    // Firmado pero ilegible: no tiene sentido que Meta lo reintente.
    return res.status(200).send('EVENT_RECEIVED')
  }

  const followUps: (() => Promise<void>)[] = []
  try {
    const parsed = parseWhatsappWebhook(body)
    const resolveStore = makeResolver()

    // Cada mensaje por su lado: si uno falla, los demas se guardan igual, y
    // el que falla queda en waUnprocessed con todo lo que mando Meta.
    for (const m of parsed.messages) {
      let storeId: string | null = null
      try {
        storeId = await resolveStore(m.account)
        if (!storeId) continue
        const r = m.type === 'reaction'
          ? await saveIncomingReaction(storeId, m)
          : await saveIncomingMessage(storeId, m)
        followUps.push(...r.followUps)
      } catch (error) {
        await saveUnprocessed({
          storeId, phoneNumberId: m.account.phoneNumberId, waMessageId: m.waMessageId,
          kind: m.origin === 'echo' ? 'echo' : 'message', raw: m.raw, error,
        })
      }
    }

    for (const s of parsed.statuses) {
      let storeId: string | null = null
      try {
        storeId = await resolveStore(s.account)
        if (!storeId) continue
        await applyStatus(storeId, s)
      } catch (error) {
        await saveUnprocessed({
          storeId, phoneNumberId: s.account.phoneNumberId, waMessageId: s.waMessageId,
          kind: 'status', raw: s, error,
        })
      }
    }

    if (parsed.contactSyncs.length) {
      const porCuenta = new Map<string, typeof parsed.contactSyncs>()
      for (const c of parsed.contactSyncs) {
        const storeId = await resolveStore(c.account)
        if (!storeId) continue
        porCuenta.set(storeId, [...(porCuenta.get(storeId) || []), c])
      }
      for (const [storeId, list] of porCuenta) {
        followUps.push(() => applyContactSyncs(storeId, list))
      }
    }

    // history (fase 1), account_update, template status, etc.: aceptados e ignorados.
    for (const i of parsed.ignored) {
      console.log(`[whatsapp-webhook] campo '${i.field}' ignorado (phoneNumberId=${i.account.phoneNumberId || '-'})`)
    }

    if (parsed.messages.length || parsed.statuses.length) {
      console.log(`[whatsapp-webhook] ${parsed.messages.length} mensaje(s), ${parsed.statuses.length} estado(s)`)
    }
  } catch (error) {
    console.error('[whatsapp-webhook] Error procesando el evento:', (error as Error).message)
    await saveUnprocessed({ kind: 'payload', raw: body, error })
  }

  // ---------- Trabajo diferido (adjuntos, miniaturas, push) ----------
  if (followUps.length) {
    const work = Promise.allSettled(followUps.map(fn => fn())).then(() => undefined)
    const waitUntil = getWaitUntil()
    if (waitUntil) {
      waitUntil(work)
    } else {
      await Promise.race([work, new Promise(r => setTimeout(r, FOLLOWUP_BUDGET_MS))])
    }
  }

  return res.status(200).send('EVENT_RECEIVED')
}

// Cuerpo crudo para verificar la firma (mismo patron que stripe-webhook) y
// margen para que waitUntil termine de bajar adjuntos grandes.
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
}
