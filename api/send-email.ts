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

function getWelcomeEmail(storeName: string, subdomain: string, lang: string) {
  const isEn = lang === 'en'
  return {
    subject: isEn
      ? `${storeName} is live! Here's how to get your first sale`
      : `${storeName} ya está online! Así consigues tu primera venta`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fbff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <img src="https://shopifree.app/newlogo.png" alt="Shopifree" height="36" style="height:36px">
  </div>
  <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h1 style="color:#1e3a5f;font-size:24px;margin:0 0 8px">${isEn ? 'Your store is live!' : 'Tu tienda ya está online!'} 🎉</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px">
      ${isEn
        ? `<strong>${storeName}</strong> is ready to receive orders. Here are 3 quick steps to get your first sale:`
        : `<strong>${storeName}</strong> está lista para recibir pedidos. Aquí van 3 pasos rápidos para tu primera venta:`}
    </p>
    <div style="background:#f0f7ff;border-radius:12px;padding:20px;margin-bottom:16px">
      <p style="margin:0 0 12px;font-size:14px;color:#1e3a5f"><strong>1. ${isEn ? 'Add your first products' : 'Agrega tus primeros productos'}</strong></p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">${isEn ? 'Photo, name, and price. That\'s all you need.' : 'Foto, nombre y precio. Es todo lo que necesitas.'}</p>
    </div>
    <div style="background:#f0f7ff;border-radius:12px;padding:20px;margin-bottom:16px">
      <p style="margin:0 0 12px;font-size:14px;color:#1e3a5f"><strong>2. ${isEn ? 'Share your link' : 'Comparte tu link'}</strong></p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">${isEn ? 'Your catalog is at' : 'Tu catálogo está en'}: <a href="https://${subdomain}.shopifree.app" style="color:#2d6cb5">${subdomain}.shopifree.app</a></p>
    </div>
    <div style="background:#f0f7ff;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 12px;font-size:14px;color:#1e3a5f"><strong>3. ${isEn ? 'Receive orders on WhatsApp' : 'Recibe pedidos en WhatsApp'}</strong></p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">${isEn ? 'Your customers order from the catalog and the order arrives directly to your WhatsApp.' : 'Tus clientes piden desde el catálogo y el pedido llega directo a tu WhatsApp.'}</p>
    </div>
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d6cb5);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:12px;color:#38bdf8">${isEn ? 'You have 14 days of' : 'Tienes 14 días de'}</p>
      <p style="margin:0 0 12px;font-size:20px;color:white;font-weight:700">Pro ${isEn ? 'free trial' : 'gratis'} ✨</p>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7)">${isEn ? 'Accept card payments, discount coupons, custom domain and more' : 'Cobro con tarjeta, cupones de descuento, dominio propio y más'}</p>
    </div>
    <a href="https://shopifree.app/dashboard" style="display:block;background:#1e3a5f;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
      ${isEn ? 'Go to my store' : 'Ir a mi tienda'} →
    </a>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px">
    Shopifree · ${isEn ? 'Create your catalog and sell via WhatsApp' : 'Crea tu catálogo y vende por WhatsApp'}
  </p>
</div>
</body>
</html>`
  }
}

function getReminderHtml(storeName: string, daysLeft: number, lang: string) {
  const isEn = lang === 'en'
  return {
    subject: isEn
      ? `${daysLeft} days left on your Pro trial - ${storeName}`
      : `Te quedan ${daysLeft} días de Pro gratis - ${storeName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fbff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <img src="https://shopifree.app/newlogo.png" alt="Shopifree" height="36" style="height:36px">
  </div>
  <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h1 style="color:#1e3a5f;font-size:24px;margin:0 0 8px">${isEn ? `${daysLeft} days left on Pro` : `Te quedan ${daysLeft} días de Pro`} ⏳</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px">
      ${isEn
        ? `Your free Pro trial for <strong>${storeName}</strong> ends soon. After that, you'll switch to the free plan.`
        : `Tu prueba gratuita de Pro para <strong>${storeName}</strong> termina pronto. Después pasarás al plan gratuito.`}
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:14px;color:#9a3412;font-weight:600">${isEn ? 'What you\'ll lose without Pro:' : 'Lo que pierdes sin Pro:'}</p>
      <ul style="margin:0;padding:0 0 0 20px;color:#9a3412;font-size:13px;line-height:1.8">
        <li>${isEn ? 'Accept card payments online' : 'Cobrar con tarjeta online'}</li>
        <li>${isEn ? 'Discount coupons' : 'Cupones de descuento'}</li>
        <li>${isEn ? 'Your own .com domain' : 'Tu propio dominio .com'}</li>
        <li>${isEn ? 'Up to 200 products (free: 10)' : 'Hasta 200 productos (gratis: 10)'}</li>
        <li>${isEn ? '5 photos per product' : '5 fotos por producto'}</li>
      </ul>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px">
      ${isEn
        ? 'Upgrade for just <strong>$4.99/month</strong> and keep all features.'
        : 'Pasa a Pro por solo <strong>$4.99/mes</strong> y mantén todas las funciones.'}
    </p>
    <a href="https://shopifree.app/dashboard/plan" style="display:block;background:linear-gradient(135deg,#1e3a5f,#2d6cb5);color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
      ${isEn ? 'Upgrade to Pro' : 'Pasarme a Pro'} →
    </a>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px">
    Shopifree · ${isEn ? 'Create your catalog and sell via WhatsApp' : 'Crea tu catálogo y vende por WhatsApp'}
  </p>
</div>
</body>
</html>`
  }
}

function getExpiredHtml(storeName: string, lang: string) {
  const isEn = lang === 'en'
  return {
    subject: isEn
      ? `Your Pro trial ended - ${storeName}`
      : `Tu periodo Pro terminó - ${storeName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fbff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <img src="https://shopifree.app/newlogo.png" alt="Shopifree" height="36" style="height:36px">
  </div>
  <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h1 style="color:#1e3a5f;font-size:24px;margin:0 0 8px">${isEn ? 'Your Pro trial has ended' : 'Tu periodo Pro terminó'}</h1>
    <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px">
      ${isEn
        ? `<strong>${storeName}</strong> is now on the free plan. Your store is still online, but some features are limited.`
        : `<strong>${storeName}</strong> ahora está en el plan gratuito. Tu tienda sigue online, pero algunas funciones están limitadas.`}
    </p>
    <div style="background:#f0f7ff;border-radius:12px;padding:20px;margin-bottom:16px">
      <p style="margin:0 0 4px;font-size:14px;color:#1e3a5f;font-weight:600">${isEn ? 'Free plan' : 'Plan Gratuito'}</p>
      <p style="margin:0;font-size:13px;color:#64748b">${isEn ? '10 products, 1 photo each, WhatsApp orders' : '10 productos, 1 foto cada uno, pedidos por WhatsApp'}</p>
    </div>
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d6cb5);border-radius:12px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:14px;color:#38bdf8;font-weight:600">Pro - $4.99/${isEn ? 'mo' : 'mes'}</p>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8)">${isEn ? '200 products, card payments, coupons, custom domain, 5 photos' : '200 productos, cobro con tarjeta, cupones, dominio propio, 5 fotos'}</p>
    </div>
    <a href="https://shopifree.app/dashboard/plan" style="display:block;background:#1e3a5f;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
      ${isEn ? 'Upgrade to Pro' : 'Pasarme a Pro'} →
    </a>
    <p style="color:#94a3b8;font-size:13px;text-align:center;margin:16px 0 0;line-height:1.5">
      ${isEn ? 'Your store is still online on the free plan. Upgrade anytime.' : 'Tu tienda sigue online en el plan gratuito. Mejora cuando quieras.'}
    </p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px">
    Shopifree · ${isEn ? 'Create your catalog and sell via WhatsApp' : 'Crea tu catálogo y vende por WhatsApp'}
  </p>
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
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Shopifree <noreply@shopifree.app>'
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
      await resend.emails.send({ from: fromEmail, to: user.email, subject: email.subject, html: email.html })
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
      await resend.emails.send({ from: fromEmail, to: user.email, subject: email.subject, html: email.html })
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
    let emailContent: { subject: string; html: string }
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
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Shopifree <noreply@shopifree.app>',
      to: email,
      subject: emailContent.subject,
      html: emailContent.html
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
