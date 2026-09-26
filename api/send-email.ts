import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { isAdminToken } from './_shared/admin.js'
import { checkRateLimit } from './_shared/orderTotal.js'
import { shouldDowngradeExpiredTrial, LIVE_SUBSCRIPTION_STATUSES, type StoreCompData } from './_shared/plan.js'
import { checkAllWhatsappTokens } from './_shared/whatsappTokenHealth.js'
import { sweepExpiredHolds } from './_shared/reservations.js'

let db: Firestore

function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

// ── Email templates ──────────────────────────────────────────────────

type EmailTemplate = { subject: string; html: string; text: string }

// Todo dato de tienda/cliente que va al HTML se escapa: storeName/appName los
// elige el merchant y no queremos inyeccion de markup en mails de hola@.
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Mismo criterio que admin-mark-app-published: solo links https de Play Store.
function isValidPlayStoreUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === 'play.google.com'
  } catch {
    return false
  }
}

// Verifica el Firebase ID token del header Authorization. null si falta o es invalido.
async function verifyCaller(req: VercelRequest): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) return null
  try {
    getDb()
    return await getAuth().verifyIdToken(authHeader.slice(7))
  } catch {
    return null
  }
}

// Email del dueno desde Firebase Auth. NO users/{uid}.email: ese doc lo
// escribe el propio dueno (firestore.rules), asi que podia apuntar los mails
// de hola@ a cualquier direccion.
async function getOwnerEmail(ownerId: string | undefined): Promise<string> {
  if (!ownerId) return ''
  try {
    getDb()
    return (await getAuth().getUser(ownerId)).email || ''
  } catch {
    return ''
  }
}

// Marcadores trials/{ownerId} ("ya uso su trial Pro"). El cliente nuevo los
// crea en el mismo batch que la tienda, pero las apps nativas viejas no, y
// firestore.rules solo exige que NO exista antes de crear la tienda 'pro'.
// Aca se rellenan para toda tienda con trialEndsAt: la primera vez recorre
// todas (queda marcado en _cron/trialMarkers), despues solo las de la ultima
// ventana (trial de 7 dias => trialEndsAt >= hoy - 3d cubre las nuevas).
// create() es idempotente: si el marcador ya existe no lo pisa.
async function backfillTrialMarkers(firestore: Firestore, now: Date): Promise<number> {
  const stateRef = firestore.doc('_cron/trialMarkers')
  const state = await stateRef.get()
  const fullDone = state.exists && state.data()?.fullBackfillDone === true

  const since = fullDone ? new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) : new Date(0)
  const snap = await firestore.collection('stores')
    .where('trialEndsAt', '>=', since)
    .select('ownerId')
    .get()

  const owners = new Map<string, string>()
  for (const d of snap.docs) {
    const ownerId = d.get('ownerId')
    if (typeof ownerId === 'string' && ownerId && !owners.has(ownerId)) owners.set(ownerId, d.id)
  }

  let created = 0
  const entries = [...owners.entries()]
  for (let i = 0; i < entries.length; i += 300) {
    const chunk = entries.slice(i, i + 300)
    const refs = chunk.map(([ownerId]) => firestore.doc(`trials/${ownerId}`))
    const existing = await firestore.getAll(...refs)
    const batch = firestore.batch()
    let pending = 0
    existing.forEach((snapTrial, idx) => {
      if (snapTrial.exists) return
      batch.create(refs[idx], { storeId: chunk[idx][1], createdAt: now, backfilled: true })
      pending++
    })
    if (pending) {
      try {
        await batch.commit()
        created += pending
      } catch (err) {
        // Carrera con un alta nueva (create falla si ya existe): reintenta
        // uno por uno ignorando los que ya estan.
        for (const [idx, snapTrial] of existing.entries()) {
          if (snapTrial.exists) continue
          try {
            await refs[idx].create({ storeId: chunk[idx][1], createdAt: now, backfilled: true })
            created++
          } catch { /* ya existe */ }
        }
        console.warn('[cron] trial markers batch retried one by one:', err)
      }
    }
  }

  if (!fullDone) {
    await stateRef.set({ fullBackfillDone: true, doneAt: now }, { merge: true })
  }
  return created
}

// Links del panel con prefijo de idioma: /dashboard/* sin idioma redirige a
// /es/dashboard y pierde el path (el link a /dashboard/plan caia en el inicio).
function dashboardUrl(lang: string, path = ''): string {
  return `https://shopifree.app/${lang === 'en' ? 'en' : 'es'}/dashboard${path}`
}

function getWelcomeEmail(storeName: string, subdomain: string, lang: string): EmailTemplate {
  const isEn = lang === 'en'
  const text = isEn
    ? `Hi!\n\n${storeName} is online and ready to receive orders.\n\nHere are your next steps:\n\n1. Add your first products — just a photo, name, and price.\n2. Share your store link: https://${subdomain}.shopifree.app\n3. Your customers will order from the catalog and you'll receive it on WhatsApp.\n\nYour account includes a 7-day Pro trial with all features.\n\nGo to your dashboard:\n${dashboardUrl(lang)}\n\nIf you have any questions, just reply to this email.\n\n— Shopifree`
    : `Hola!\n\n${storeName} ya esta online y lista para recibir pedidos.\n\nEstos son tus siguientes pasos:\n\n1. Agrega tus primeros productos — solo foto, nombre y precio.\n2. Comparte el link de tu tienda: https://${subdomain}.shopifree.app\n3. Tus clientes piden desde el catalogo y te llega al WhatsApp.\n\nTu cuenta incluye 7 dias de prueba Pro con todas las funciones.\n\nIr a tu panel:\n${dashboardUrl(lang)}\n\nSi tenes alguna duda, responde este email.\n\n— Shopifree`
  return {
    subject: isEn
      ? `${storeName} is live — next steps`
      : `${storeName} ya esta online — siguientes pasos`,
    text,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#333;line-height:1.6">
<div style="max-width:480px;margin:0 auto;padding:32px 16px">
  <p>${isEn ? 'Hi!' : 'Hola!'}</p>
  <p><strong>${escapeHtml(storeName)}</strong> ${isEn ? 'is online and ready to receive orders.' : 'ya esta online y lista para recibir pedidos.'}</p>
  <p>${isEn ? 'Here are your next steps:' : 'Estos son tus siguientes pasos:'}</p>
  <p>
    <strong>1.</strong> ${isEn ? 'Add your first products' : 'Agrega tus primeros productos'} — ${isEn ? 'just a photo, name, and price.' : 'solo foto, nombre y precio.'}<br>
    <strong>2.</strong> ${isEn ? 'Share your store link:' : 'Comparte el link de tu tienda:'} <a href="https://${escapeHtml(subdomain)}.shopifree.app" style="color:#2563eb">${escapeHtml(subdomain)}.shopifree.app</a><br>
    <strong>3.</strong> ${isEn ? 'Your customers will order from the catalog and you\'ll receive it on WhatsApp.' : 'Tus clientes piden desde el catalogo y te llega al WhatsApp.'}
  </p>
  <p>${isEn ? 'Your account includes a 7-day Pro trial with all features.' : 'Tu cuenta incluye 7 dias de prueba Pro con todas las funciones.'}</p>
  <p><a href="${dashboardUrl(lang)}" style="color:#2563eb">${isEn ? 'Go to your dashboard' : 'Ir a tu panel'}</a></p>
  <p>${isEn ? 'If you have any questions, just reply to this email.' : 'Si tenes alguna duda, responde este email.'}</p>
  <p style="color:#999;margin-top:32px;font-size:12px">— Shopifree</p>
</div>
</body>
</html>`
  }
}

function getReminderHtml(storeName: string, daysLeft: number, lang: string): EmailTemplate {
  const isEn = lang === 'en'
  const text = isEn
    ? `Hi,\n\nYour Pro trial for ${storeName} ends in ${daysLeft} days.\n\nAfter that, your store switches to the free plan and you'll lose access to:\n\n- Card payments\n- Discount coupons\n- Custom domain\n- Products go from 200 to 10\n- Photos per product go from 5 to 1\n\nYou can keep everything for $4.99/month:\n${dashboardUrl(lang, '/plan')}\n\nIf you have questions, reply to this email.\n\n— Shopifree`
    : `Hola,\n\nLa prueba Pro de ${storeName} termina en ${daysLeft} dias.\n\nDespues, tu tienda pasa al plan gratuito y perdes acceso a:\n\n- Cobro con tarjeta\n- Cupones de descuento\n- Dominio propio\n- Productos pasan de 200 a 10\n- Fotos por producto pasan de 5 a 1\n\nPodes mantener todo por $4.99/mes:\n${dashboardUrl(lang, '/plan')}\n\nSi tenes dudas, responde este email.\n\n— Shopifree`
  return {
    subject: isEn
      ? `${daysLeft} days left on your Pro trial`
      : `Te quedan ${daysLeft} dias de Pro`,
    text,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#333;line-height:1.6">
<div style="max-width:480px;margin:0 auto;padding:32px 16px">
  <p>${isEn ? 'Hi,' : 'Hola,'}</p>
  <p>${isEn
    ? `Your Pro trial for <strong>${escapeHtml(storeName)}</strong> ends in ${daysLeft} days.`
    : `La prueba Pro de <strong>${escapeHtml(storeName)}</strong> termina en ${daysLeft} dias.`}</p>
  <p>${isEn ? 'After that, your store switches to the free plan and you\'ll lose access to:' : 'Despues, tu tienda pasa al plan gratuito y perdes acceso a:'}</p>
  <ul style="padding-left:20px">
    <li>${isEn ? 'Card payments' : 'Cobro con tarjeta'}</li>
    <li>${isEn ? 'Discount coupons' : 'Cupones de descuento'}</li>
    <li>${isEn ? 'Custom domain' : 'Dominio propio'}</li>
    <li>${isEn ? 'Products go from 200 to 10' : 'Productos pasan de 200 a 10'}</li>
    <li>${isEn ? 'Photos per product go from 5 to 1' : 'Fotos por producto pasan de 5 a 1'}</li>
  </ul>
  <p>${isEn
    ? `You can keep everything for $4.99/month.`
    : `Podes mantener todo por $4.99/mes.`}</p>
  <p><a href="${dashboardUrl(lang, '/plan')}" style="color:#2563eb">${isEn ? 'See plans' : 'Ver planes'}</a></p>
  <p>${isEn ? 'If you have questions, reply to this email.' : 'Si tenes dudas, responde este email.'}</p>
  <p style="color:#999;margin-top:32px;font-size:12px">— Shopifree</p>
</div>
</body>
</html>`
  }
}

function getExpiredHtml(storeName: string, lang: string): EmailTemplate {
  const isEn = lang === 'en'
  const text = isEn
    ? `Hi,\n\nThe Pro trial for ${storeName} has ended. Your store is now on the free plan.\n\nYour store is still online, but these features are now limited:\n\n- Products: 10 (was 200)\n- Photos per product: 1 (was 5)\n- Card payments: disabled\n- Coupons: disabled\n- Custom domain: disabled\n\nYou can upgrade anytime for $4.99/month:\n${dashboardUrl(lang, '/plan')}\n\nReply to this email if you need help.\n\n— Shopifree`
    : `Hola,\n\nLa prueba Pro de ${storeName} termino. Tu tienda ahora esta en el plan gratuito.\n\nTu tienda sigue online, pero estas funciones estan limitadas:\n\n- Productos: 10 (eran 200)\n- Fotos por producto: 1 (eran 5)\n- Cobro con tarjeta: desactivado\n- Cupones: desactivado\n- Dominio propio: desactivado\n\nPodes mejorar tu plan en cualquier momento por $4.99/mes:\n${dashboardUrl(lang, '/plan')}\n\nResponde este email si necesitas ayuda.\n\n— Shopifree`
  return {
    subject: isEn
      ? `Your Pro trial ended`
      : `Tu periodo Pro termino`,
    text,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#333;line-height:1.6">
<div style="max-width:480px;margin:0 auto;padding:32px 16px">
  <p>${isEn ? 'Hi,' : 'Hola,'}</p>
  <p>${isEn
    ? `The Pro trial for <strong>${escapeHtml(storeName)}</strong> has ended. Your store is now on the free plan.`
    : `La prueba Pro de <strong>${escapeHtml(storeName)}</strong> termino. Tu tienda ahora esta en el plan gratuito.`}</p>
  <p>${isEn ? 'Your store is still online, but these features are now limited:' : 'Tu tienda sigue online, pero estas funciones estan limitadas:'}</p>
  <ul style="padding-left:20px">
    <li>${isEn ? 'Products: 10 (was 200)' : 'Productos: 10 (eran 200)'}</li>
    <li>${isEn ? 'Photos per product: 1 (was 5)' : 'Fotos por producto: 1 (eran 5)'}</li>
    <li>${isEn ? 'Card payments: disabled' : 'Cobro con tarjeta: desactivado'}</li>
    <li>${isEn ? 'Coupons: disabled' : 'Cupones: desactivado'}</li>
    <li>${isEn ? 'Custom domain: disabled' : 'Dominio propio: desactivado'}</li>
  </ul>
  <p>${isEn
    ? `You can upgrade anytime for $4.99/month.`
    : `Podes mejorar tu plan en cualquier momento por $4.99/mes.`}</p>
  <p><a href="${dashboardUrl(lang, '/plan')}" style="color:#2563eb">${isEn ? 'See plans' : 'Ver planes'}</a></p>
  <p>${isEn ? 'Reply to this email if you need help.' : 'Responde este email si necesitas ayuda.'}</p>
  <p style="color:#999;margin-top:32px;font-size:12px">— Shopifree</p>
</div>
</body>
</html>`
  }
}

// ── Cron: tokens de WhatsApp (ShopiChat) ─────────────────────────────

// Renueva los tokens por vencer y avisa (mail + push, una vez) a los dueños
// cuyo token no se pudo renovar o ya no sirve. Ver _shared/whatsappTokenHealth.ts.
async function runWhatsappTokenCheck() {
  try {
    return await checkAllWhatsappTokens()
  } catch (err) {
    console.error('[cron] whatsapp token check error:', err)
    return null
  }
}

// ── Cron: reservas de stock/cupón vencidas ───────────────────────────

// Las reservas vencidas ya cuentan como libres en cada transacción; esto solo
// borra las entradas/docs que nadie volvió a tocar (ver _shared/reservations.ts).
async function runReservationSweep() {
  try {
    return await sweepExpiredHolds(getDb())
  } catch (err) {
    console.error('[cron] reservation sweep error:', err)
    return null
  }
}

// ── Cron: scan stores and send trial reminder/expired emails ─────────

async function handleCron(req: VercelRequest, res: VercelResponse) {
  // Fail closed: sin CRON_SECRET configurado nadie puede disparar el cron
  // (Vercel Cron manda `Authorization: Bearer $CRON_SECRET` automaticamente).
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron] CRON_SECRET not configured — refusing to run')
    return res.status(500).json({ error: 'Cron not configured' })
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Sin mails igual se rellenan los marcadores de trial (no dependen de Resend).
    let trialMarkers = 0
    try {
      trialMarkers = await backfillTrialMarkers(getDb(), new Date())
    } catch (err) {
      console.error('[cron] trial markers backfill error:', err)
    }
    const whatsappTokens = await runWhatsappTokenCheck()
    const reservationHolds = await runReservationSweep()
    return res.status(200).json({ ok: true, skipped: true, trialMarkers, whatsappTokens, reservationHolds })
  }

  const resend = new Resend(apiKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Giacomo de Shopifree <hola@shopifree.app>'
  const firestore = getDb()
  const now = new Date()
  let remindersSent = 0
  let expiredSent = 0

  // 1. Trial ending in ~4 days → send reminder
  const reminderStart = new Date(now)
  reminderStart.setDate(reminderStart.getDate() + 3)
  const reminderEnd = new Date(now)
  reminderEnd.setDate(reminderEnd.getDate() + 5)

  const reminderQuery = await firestore.collection('stores')
    .where('plan', '==', 'pro')
    .where('trialEndsAt', '>=', reminderStart)
    .where('trialEndsAt', '<=', reminderEnd)
    .get()

  for (const doc of reminderQuery.docs) {
    const store = doc.data()
    if ((store.emailsSent || []).includes('trial-reminder')) continue
    // Already paying (upgraded during the trial) — "your trial is ending"
    // would be wrong and reads like a billing scare. Skip.
    if ((LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(store.subscription?.status)) continue

    const ownerEmail = await getOwnerEmail(store.ownerId)
    if (!ownerEmail) continue

    const trialEnd = store.trialEndsAt?.toDate?.() || new Date(store.trialEndsAt)
    const daysLeft = Math.max(1, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const email = getReminderHtml(store.name, daysLeft, store.language || 'es')

    try {
      await resend.emails.send({ from: fromEmail, to: ownerEmail, subject: email.subject, html: email.html, text: email.text, headers: { 'List-Unsubscribe': '<mailto:unsubscribe@shopifree.app>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
      await firestore.doc(`stores/${doc.id}`).update({ emailsSent: FieldValue.arrayUnion('trial-reminder') })
      remindersSent++
    } catch (err) {
      console.error(`[cron] reminder error ${doc.id}:`, err)
    }
  }

  // 2. Trial expired 0-2 days ago → send expired
  const expiredStart = new Date(now)
  expiredStart.setDate(expiredStart.getDate() - 2)

  const expiredQuery = await firestore.collection('stores')
    .where('trialEndsAt', '>=', expiredStart)
    .where('trialEndsAt', '<=', now)
    .get()

  for (const doc of expiredQuery.docs) {
    const store = doc.data()
    if ((store.emailsSent || []).includes('trial-expired')) continue
    // Solo avisar "tu tienda paso a free" si de verdad corresponde bajarla:
    // pagos (active/trialing/past_due), comps de admin y manualRestoration
    // quedan afuera — mismo criterio que el downgrade de abajo. Si otro cron
    // (expireTrials) ya la paso a free, evaluamos como si siguiera en pro para
    // que el aviso igual salga.
    const asPaid = { ...store, plan: store.plan === 'free' ? 'pro' : store.plan } as StoreCompData
    if (!shouldDowngradeExpiredTrial(asPaid)) continue

    const ownerEmail = await getOwnerEmail(store.ownerId)
    if (!ownerEmail) continue

    const email = getExpiredHtml(store.name, store.language || 'es')

    try {
      await resend.emails.send({ from: fromEmail, to: ownerEmail, subject: email.subject, html: email.html, text: email.text, headers: { 'List-Unsubscribe': '<mailto:unsubscribe@shopifree.app>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
      await firestore.doc(`stores/${doc.id}`).update({ emailsSent: FieldValue.arrayUnion('trial-expired') })
      expiredSent++
    } catch (err) {
      console.error(`[cron] expired error ${doc.id}:`, err)
    }
  }

  // 3. Auto-downgrade all expired trials to free plan
  let downgraded = 0
  const expiredTrialsQuery = await firestore.collection('stores')
    .where('trialEndsAt', '<', now)
    .where('plan', 'in', ['pro', 'business'])
    .get()

  for (const doc of expiredTrialsQuery.docs) {
    const store = doc.data()
    // Misma logica de plan efectivo que el resto del servidor
    // (api/_shared/plan.ts): no bajar tiendas que pagan (active/trialing/
    // past_due), con manualRestoration vigente o con comp de admin
    // (planExpiresAt futuro o null sin suscripcion).
    if (!shouldDowngradeExpiredTrial(store as StoreCompData)) {
      continue
    }
    await firestore.doc(`stores/${doc.id}`).update({
      plan: 'free',
      updatedAt: FieldValue.serverTimestamp()
    })
    downgraded++
    console.log(`[cron] Downgraded store ${doc.id} (${store.name}) from ${store.plan} to free`)
  }

  // 4. Marcadores de trial usado para tiendas creadas por clientes viejos
  let trialMarkers = 0
  try {
    trialMarkers = await backfillTrialMarkers(firestore, now)
  } catch (err) {
    console.error('[cron] trial markers backfill error:', err)
  }

  // 5. Tokens de WhatsApp de ShopiChat
  const whatsappTokens = await runWhatsappTokenCheck()

  // 6. Reservas de stock/cupón vencidas
  const reservationHolds = await runReservationSweep()

  return res.status(200).json({ ok: true, remindersSent, expiredSent, downgraded, trialMarkers, whatsappTokens, reservationHolds })
}

// ── Main handler ─────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET = cron trigger (Vercel crons use GET)
  if (req.method === 'GET') {
    return handleCron(req, res)
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // POST = send a specific email
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[send-email] RESEND_API_KEY not configured')
    return res.status(200).json({ ok: true, skipped: true })
  }

  try {
    const { type, storeId, lang = 'es', daysLeft } = (req.body || {}) as {
      type?: string; storeId?: string; lang?: string; daysLeft?: number
    }

    // Todo POST requiere Firebase ID token: antes era un relay abierto desde
    // hola@shopifree.app (destinatario, nombre y link elegidos por el cliente).
    //
    // Compat: las apps nativas ya publicadas (bundle viejo) mandan 'welcome'
    // (Register) y 'app-request' (MiApp) SIN token. Se aceptan solo esos dos,
    // solo si no viene header Authorization (token invalido = 401) y con datos
    // 100% del servidor: el welcome va al email de Firebase Auth del dueno,
    // una vez por tienda y solo si la tienda es recien creada; el app-request
    // va al admin, solo si la tienda de verdad pidio la app hace poco y como
    // mucho uno por hora por tienda. body.email/storeName/subdomain se ignoran.
    const caller = await verifyCaller(req)
    const isLegacyCall = !caller
      && !req.headers.authorization
      && (type === 'welcome' || type === 'app-request')
    if (!caller && !isLegacyCall) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // App published → solo admin (lo llama admin-mark-app-published reenviando
    // el token del admin). El link tiene que ser de Play Store.
    if (type === 'app-published') {
      if (!caller || !isAdminToken(caller)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      const { androidUrl, email, storeName, appName } = req.body as {
        androidUrl?: string; email?: string; storeName?: string; appName?: string
      }
      if (!email || typeof email !== 'string' || !isValidPlayStoreUrl(androidUrl)) {
        return res.status(400).json({ error: 'Missing email or valid androidUrl for app-published' })
      }
      const resend = new Resend(apiKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Giacomo de Shopifree <hola@shopifree.app>'
      const label = String(appName || storeName || 'tu tienda')
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `${label} ya esta en Play Store`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1e3a5f;">Tu app ya esta publicada</h2>
            <p>Hola! La app de <strong>${escapeHtml(label)}</strong> ya esta disponible en Google Play Store.</p>
            <p style="margin: 24px 0;">
              <a href="${escapeHtml(androidUrl)}" style="display: inline-block; padding: 12px 20px; background: #1e3a5f; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Ver en Play Store</a>
            </p>
            <p style="color: #666; font-size: 14px;">Tus clientes ya pueden descargarla. Ahora podes enviarles notificaciones push desde tu panel de Mi App.</p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">Gracias por confiar en Shopifree 💙</p>
          </div>
        `,
        text: `Tu app de ${label} ya esta en Play Store: ${androidUrl}`,
      })
      return res.status(200).json({ ok: true })
    }

    if (!type || !storeId || typeof storeId !== 'string') {
      return res.status(400).json({ error: 'Missing required fields: type, storeId' })
    }

    const firestore = getDb()

    // El resto de los tipos son del dueno de la tienda (o admin). Los datos
    // de la tienda se leen del servidor, nunca del body.
    const storeDoc = await firestore.doc(`stores/${storeId}`).get()
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' })
    }
    const storeData = storeDoc.data() as {
      ownerId?: string; name?: string; subdomain?: string; emailsSent?: string[]
      createdAt?: { toDate?: () => Date }
      appConfig?: { appName?: string; status?: string; requestedAt?: { toDate?: () => Date } }
    }
    if (caller) {
      const isOwner = storeData.ownerId === caller.uid
      if (!isOwner && !isAdminToken(caller)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } else {
      // Llamada legacy sin token (ver arriba)
      const ageMs = (d?: { toDate?: () => Date }) => {
        const date = d?.toDate?.()
        return date ? Date.now() - date.getTime() : Infinity
      }
      if (type === 'welcome' && ageMs(storeData.createdAt) > 48 * 60 * 60 * 1000) {
        return res.status(200).json({ ok: true, skipped: true, reason: 'legacy_store_not_new' })
      }
      if (type === 'app-request') {
        if (storeData.appConfig?.status !== 'requested' || ageMs(storeData.appConfig?.requestedAt) > 60 * 60 * 1000) {
          return res.status(200).json({ ok: true, skipped: true, reason: 'legacy_no_pending_request' })
        }
        if (!(await checkRateLimit(firestore, 'app-request-legacy', storeId, 1, 3600))) {
          return res.status(200).json({ ok: true, skipped: true, reason: 'already_sent' })
        }
      }
    }
    const storeName = storeData.name || 'Tu tienda'
    const subdomain = storeData.subdomain || ''

    // App request notification → send to admin, no dedup needed
    if (type === 'app-request') {
      const appName = storeData.appConfig?.appName || storeName
      const resend = new Resend(apiKey)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Giacomo de Shopifree <hola@shopifree.app>'
      const adminEmail = process.env.ADMIN_EMAIL || 'giiacomo@gmail.com'
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `Nueva solicitud de app: ${storeName}`,
        html: `<p><strong>${escapeHtml(storeName)}</strong> (${escapeHtml(subdomain)}.shopifree.app) ha solicitado la publicacion de su app movil.</p><p>App name: ${escapeHtml(appName)}</p><p>Store ID: ${escapeHtml(storeId)}</p><p><a href="https://shopifree.app/es/admin">Ir al panel admin</a></p>`,
        text: `${storeName} (${subdomain}.shopifree.app) solicita su app. App: ${appName}. Store ID: ${storeId}`,
      })
      return res.status(200).json({ ok: true })
    }

    // Legacy sin token: solo 'welcome' llega hasta aca
    if (!caller && type !== 'welcome') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Destinatario: el email de Firebase Auth del dueno, nunca body.email ni
    // users/{ownerId}.email (ese doc lo edita el propio dueno).
    const email = await getOwnerEmail(storeData.ownerId)
    if (!email) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'no_owner_email' })
    }

    // Check if already sent
    const emailsSent: string[] = storeData.emailsSent || []
    if (emailsSent.includes(type)) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'already_sent' })
    }

    // Build email
    let emailContent: EmailTemplate
    switch (type) {
      case 'welcome':
        emailContent = getWelcomeEmail(storeName, subdomain, lang)
        break
      case 'trial-reminder':
        emailContent = getReminderHtml(storeName, Math.max(1, Math.min(7, Math.floor(Number(daysLeft)) || 4)), lang)
        break
      case 'trial-expired':
        emailContent = getExpiredHtml(storeName, lang)
        break
      default:
        return res.status(400).json({ error: `Unknown email type: ${type}` })
    }

    // Send
    const resend = new Resend(apiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Giacomo de Shopifree <hola@shopifree.app>'
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@shopifree.app>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      }
    })

    if (error) {
      console.error('[send-email] Resend error:', error)
      return res.status(500).json({ error: error.message })
    }

    // Mark as sent
    await firestore.doc(`stores/${storeId}`).update({
      emailsSent: FieldValue.arrayUnion(type)
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[send-email] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
