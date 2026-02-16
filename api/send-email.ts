import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'

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

function getWelcomeEmail(storeName: string, subdomain: string, lang: string): EmailTemplate {
  const isEn = lang === 'en'
  const text = isEn
    ? `Hi!\n\n${storeName} is online and ready to receive orders.\n\nHere are your next steps:\n\n1. Add your first products — just a photo, name, and price.\n2. Share your store link: https://${subdomain}.shopifree.app\n3. Your customers will order from the catalog and you'll receive it on WhatsApp.\n\nYour account includes a 14-day Pro trial with all features.\n\nGo to your dashboard:\nhttps://shopifree.app/dashboard\n\nIf you have any questions, just reply to this email.\n\n— Shopifree`
    : `Hola!\n\n${storeName} ya esta online y lista para recibir pedidos.\n\nEstos son tus siguientes pasos:\n\n1. Agrega tus primeros productos — solo foto, nombre y precio.\n2. Comparte el link de tu tienda: https://${subdomain}.shopifree.app\n3. Tus clientes piden desde el catalogo y te llega al WhatsApp.\n\nTu cuenta incluye 14 dias de prueba Pro con todas las funciones.\n\nIr a tu panel:\nhttps://shopifree.app/dashboard\n\nSi tenes alguna duda, responde este email.\n\n— Shopifree`
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
  <p><strong>${storeName}</strong> ${isEn ? 'is online and ready to receive orders.' : 'ya esta online y lista para recibir pedidos.'}</p>
  <p>${isEn ? 'Here are your next steps:' : 'Estos son tus siguientes pasos:'}</p>
  <p>
    <strong>1.</strong> ${isEn ? 'Add your first products' : 'Agrega tus primeros productos'} — ${isEn ? 'just a photo, name, and price.' : 'solo foto, nombre y precio.'}<br>
    <strong>2.</strong> ${isEn ? 'Share your store link:' : 'Comparte el link de tu tienda:'} <a href="https://${subdomain}.shopifree.app" style="color:#2563eb">${subdomain}.shopifree.app</a><br>
    <strong>3.</strong> ${isEn ? 'Your customers will order from the catalog and you\'ll receive it on WhatsApp.' : 'Tus clientes piden desde el catalogo y te llega al WhatsApp.'}
  </p>
  <p>${isEn ? 'Your account includes a 14-day Pro trial with all features.' : 'Tu cuenta incluye 14 dias de prueba Pro con todas las funciones.'}</p>
  <p><a href="https://shopifree.app/dashboard" style="color:#2563eb">${isEn ? 'Go to your dashboard' : 'Ir a tu panel'}</a></p>
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
    ? `Hi,\n\nYour Pro trial for ${storeName} ends in ${daysLeft} days.\n\nAfter that, your store switches to the free plan and you'll lose access to:\n\n- Card payments\n- Discount coupons\n- Custom domain\n- Products go from 200 to 10\n- Photos per product go from 5 to 1\n\nYou can keep everything for $4.99/month:\nhttps://shopifree.app/dashboard/plan\n\nIf you have questions, reply to this email.\n\n— Shopifree`
    : `Hola,\n\nLa prueba Pro de ${storeName} termina en ${daysLeft} dias.\n\nDespues, tu tienda pasa al plan gratuito y perdes acceso a:\n\n- Cobro con tarjeta\n- Cupones de descuento\n- Dominio propio\n- Productos pasan de 200 a 10\n- Fotos por producto pasan de 5 a 1\n\nPodes mantener todo por $4.99/mes:\nhttps://shopifree.app/dashboard/plan\n\nSi tenes dudas, responde este email.\n\n— Shopifree`
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
    ? `Your Pro trial for <strong>${storeName}</strong> ends in ${daysLeft} days.`
    : `La prueba Pro de <strong>${storeName}</strong> termina en ${daysLeft} dias.`}</p>
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
  <p><a href="https://shopifree.app/dashboard/plan" style="color:#2563eb">${isEn ? 'See plans' : 'Ver planes'}</a></p>
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
    ? `Hi,\n\nThe Pro trial for ${storeName} has ended. Your store is now on the free plan.\n\nYour store is still online, but these features are now limited:\n\n- Products: 10 (was 200)\n- Photos per product: 1 (was 5)\n- Card payments: disabled\n- Coupons: disabled\n- Custom domain: disabled\n\nYou can upgrade anytime for $4.99/month:\nhttps://shopifree.app/dashboard/plan\n\nReply to this email if you need help.\n\n— Shopifree`
    : `Hola,\n\nLa prueba Pro de ${storeName} termino. Tu tienda ahora esta en el plan gratuito.\n\nTu tienda sigue online, pero estas funciones estan limitadas:\n\n- Productos: 10 (eran 200)\n- Fotos por producto: 1 (eran 5)\n- Cobro con tarjeta: desactivado\n- Cupones: desactivado\n- Dominio propio: desactivado\n\nPodes mejorar tu plan en cualquier momento por $4.99/mes:\nhttps://shopifree.app/dashboard/plan\n\nResponde este email si necesitas ayuda.\n\n— Shopifree`
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
    ? `The Pro trial for <strong>${storeName}</strong> has ended. Your store is now on the free plan.`
    : `La prueba Pro de <strong>${storeName}</strong> termino. Tu tienda ahora esta en el plan gratuito.`}</p>
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
  <p><a href="https://shopifree.app/dashboard/plan" style="color:#2563eb">${isEn ? 'See plans' : 'Ver planes'}</a></p>
  <p>${isEn ? 'Reply to this email if you need help.' : 'Responde este email si necesitas ayuda.'}</p>
  <p style="color:#999;margin-top:32px;font-size:12px">— Shopifree</p>
</div>
</body>
</html>`
  }
}

// ── Cron: scan stores and send trial reminder/expired emails ─────────

async function handleCron(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(200).json({ ok: true, skipped: true })

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

    const userDoc = await firestore.doc(`users/${store.ownerId}`).get()
    const user = userDoc.data()
    if (!user?.email) continue

    const trialEnd = store.trialEndsAt?.toDate?.() || new Date(store.trialEndsAt)
    const daysLeft = Math.max(1, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const email = getReminderHtml(store.name, daysLeft, store.language || 'es')

    try {
      await resend.emails.send({ from: fromEmail, to: user.email, subject: email.subject, html: email.html, text: email.text, headers: { 'List-Unsubscribe': '<mailto:unsubscribe@shopifree.app>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
      await firestore.doc(`stores/${doc.id}`).update({ emailsSent: FieldValue.arrayUnion('trial-reminder') })
      remindersSent++
    } catch (err) {
      console.error(`[cron] reminder error ${user.email}:`, err)
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

    const userDoc = await firestore.doc(`users/${store.ownerId}`).get()
    const user = userDoc.data()
    if (!user?.email) continue

    const email = getExpiredHtml(store.name, store.language || 'es')

    try {
      await resend.emails.send({ from: fromEmail, to: user.email, subject: email.subject, html: email.html, text: email.text, headers: { 'List-Unsubscribe': '<mailto:unsubscribe@shopifree.app>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
      await firestore.doc(`stores/${doc.id}`).update({ emailsSent: FieldValue.arrayUnion('trial-expired') })
      expiredSent++
    } catch (err) {
      console.error(`[cron] expired error ${user.email}:`, err)
    }
  }

  return res.status(200).json({ ok: true, remindersSent, expiredSent })
}

// ── Main handler ─────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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
    const { type, email, storeName, subdomain, storeId, lang = 'es', daysLeft } = req.body

    if (!type || !email || !storeId) {
      return res.status(400).json({ error: 'Missing required fields: type, email, storeId' })
    }

    const firestore = getDb()

    // Check if already sent
    const storeDoc = await firestore.doc(`stores/${storeId}`).get()
    const emailsSent: string[] = storeDoc.data()?.emailsSent || []
    if (emailsSent.includes(type)) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'already_sent' })
    }

    // Build email
    let emailContent: EmailTemplate
    switch (type) {
      case 'welcome':
        emailContent = getWelcomeEmail(storeName || 'Tu tienda', subdomain || '', lang)
        break
      case 'trial-reminder':
        emailContent = getReminderHtml(storeName || 'Tu tienda', daysLeft || 4, lang)
        break
      case 'trial-expired':
        emailContent = getExpiredHtml(storeName || 'Tu tienda', lang)
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
    if (storeDoc.exists) {
      await firestore.doc(`stores/${storeId}`).update({
        emailsSent: FieldValue.arrayUnion(type)
      })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[send-email] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
