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
  return {
    subject: isEn
      ? `${storeName} is live — next steps`
      : `${storeName} ya esta online — siguientes pasos`,
    text: isEn
      ? `${storeName} is online and ready to receive orders.\n\n1. Add products — Photo, name, and price. That's it.\n2. Share your link — ${subdomain}.shopifree.app\n3. Receive orders on WhatsApp — Customers order from the catalog, you receive it on WhatsApp.\n\nYour account includes a 14-day Pro trial.\n\nGo to your dashboard: https://shopifree.app/dashboard\n\n—\nShopifree · Online catalogs via WhatsApp`
      : `${storeName} esta online y lista para recibir pedidos.\n\n1. Agrega productos — Foto, nombre y precio. Nada mas.\n2. Comparte tu link — ${subdomain}.shopifree.app\n3. Recibe pedidos por WhatsApp — Tus clientes piden desde el catalogo, te llega al WhatsApp.\n\nTu cuenta incluye 14 dias de prueba Pro.\n\nIr al panel: https://shopifree.app/dashboard\n\n—\nShopifree · Catalogos online por WhatsApp`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:40px 16px">
  <div style="margin-bottom:24px">
    <img src="https://shopifree.app/newlogo.png" alt="Shopifree" height="22" style="height:22px;opacity:0.7">
  </div>
  <div style="background:white;border-radius:4px;padding:32px;border:1px solid #e4e4e7">
    <h1 style="color:#18181b;font-size:20px;font-weight:600;margin:0 0 8px">${isEn ? 'Your store is ready' : 'Tu tienda esta lista'}</h1>
    <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0 0 24px">
      ${isEn
        ? `<strong style="color:#18181b">${storeName}</strong> is online and ready to receive orders.`
        : `<strong style="color:#18181b">${storeName}</strong> esta online y lista para recibir pedidos.`}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7;border-bottom:none">
          <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#18181b">1. ${isEn ? 'Add products' : 'Agrega productos'}</p>
          <p style="margin:0;font-size:12px;color:#71717a">${isEn ? 'Photo, name, and price. That\'s it.' : 'Foto, nombre y precio. Nada mas.'}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7;border-bottom:none">
          <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#18181b">2. ${isEn ? 'Share your link' : 'Comparte tu link'}</p>
          <p style="margin:0;font-size:12px;color:#71717a"><a href="https://${subdomain}.shopifree.app" style="color:#2563eb;text-decoration:none">${subdomain}.shopifree.app</a></p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 16px;background:#fafafa;border:1px solid #e4e4e7">
          <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#18181b">3. ${isEn ? 'Receive orders on WhatsApp' : 'Recibe pedidos por WhatsApp'}</p>
          <p style="margin:0;font-size:12px;color:#71717a">${isEn ? 'Customers order from the catalog, you receive it on WhatsApp.' : 'Tus clientes piden desde el catalogo, te llega al WhatsApp.'}</p>
        </td>
      </tr>
    </table>
    <p style="color:#71717a;font-size:13px;margin:0 0 20px">
      ${isEn
        ? 'Your account includes a 14-day Pro trial.'
        : 'Tu cuenta incluye 14 dias de prueba Pro.'}
    </p>
    <a href="https://shopifree.app/dashboard" style="display:block;background:#18181b;color:white;text-align:center;padding:12px;border-radius:4px;text-decoration:none;font-weight:500;font-size:14px">
      ${isEn ? 'Go to dashboard' : 'Ir al panel'}
    </a>
  </div>
  <p style="color:#a1a1aa;font-size:11px;margin-top:20px">
    Shopifree · ${isEn ? 'Online catalogs via WhatsApp' : 'Catalogos online por WhatsApp'}
  </p>
</div>
</body>
</html>`
  }
}

function getReminderHtml(storeName: string, daysLeft: number, lang: string): EmailTemplate {
  const isEn = lang === 'en'
  return {
    subject: isEn
      ? `${daysLeft} days left on your Pro trial`
      : `Te quedan ${daysLeft} dias de Pro gratis`,
    text: isEn
      ? `The Pro trial for ${storeName} ends in ${daysLeft} days. After that, your store switches to the free plan.\n\nWhat changes:\n- Card payments: Disabled\n- Discount coupons: Disabled\n- Custom domain: Disabled\n- Products: 200 → 10\n- Photos per product: 5 → 1\n\nKeep everything for $4.99/month: https://shopifree.app/dashboard/plan\n\n—\nShopifree · Online catalogs via WhatsApp`
      : `La prueba Pro de ${storeName} termina en ${daysLeft} dias. Despues, tu tienda pasa al plan gratuito.\n\nQue cambia:\n- Cobro con tarjeta: Se desactiva\n- Cupones de descuento: Se desactiva\n- Dominio propio: Se desactiva\n- Productos: 200 → 10\n- Fotos por producto: 5 → 1\n\nMantene todo por $4.99/mes: https://shopifree.app/dashboard/plan\n\n—\nShopifree · Catalogos online por WhatsApp`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:40px 16px">
  <div style="margin-bottom:24px">
    <img src="https://shopifree.app/newlogo.png" alt="Shopifree" height="22" style="height:22px;opacity:0.7">
  </div>
  <div style="background:white;border-radius:4px;padding:32px;border:1px solid #e4e4e7">
    <h1 style="color:#18181b;font-size:20px;font-weight:600;margin:0 0 8px">${isEn ? `${daysLeft} days left on Pro` : `${daysLeft} dias restantes de Pro`}</h1>
    <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0 0 24px">
      ${isEn
        ? `The Pro trial for <strong style="color:#18181b">${storeName}</strong> ends soon. After that, your store switches to the free plan.`
        : `La prueba Pro de <strong style="color:#18181b">${storeName}</strong> termina pronto. Despues, tu tienda pasa al plan gratuito.`}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Card payments' : 'Cobro con tarjeta'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#dc2626;text-align:right">${isEn ? 'Disabled' : 'Se desactiva'}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Discount coupons' : 'Cupones de descuento'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#dc2626;text-align:right">${isEn ? 'Disabled' : 'Se desactiva'}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Custom domain' : 'Dominio propio'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#dc2626;text-align:right">${isEn ? 'Disabled' : 'Se desactiva'}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Products' : 'Productos'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#dc2626;text-align:right">200 → 10</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;font-size:13px;color:#71717a">${isEn ? 'Photos per product' : 'Fotos por producto'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-left:none;font-size:13px;color:#dc2626;text-align:right">5 → 1</td>
      </tr>
    </table>
    <p style="color:#71717a;font-size:13px;margin:0 0 20px">
      ${isEn
        ? 'Keep everything for <strong style="color:#18181b">$4.99/month</strong>.'
        : 'Mantene todo por <strong style="color:#18181b">$4.99/mes</strong>.'}
    </p>
    <a href="https://shopifree.app/dashboard/plan" style="display:block;background:#18181b;color:white;text-align:center;padding:12px;border-radius:4px;text-decoration:none;font-weight:500;font-size:14px">
      ${isEn ? 'Upgrade to Pro' : 'Pasarme a Pro'}
    </a>
  </div>
  <p style="color:#a1a1aa;font-size:11px;margin-top:20px">
    Shopifree · ${isEn ? 'Online catalogs via WhatsApp' : 'Catalogos online por WhatsApp'}
  </p>
</div>
</body>
</html>`
  }
}

function getExpiredHtml(storeName: string, lang: string): EmailTemplate {
  const isEn = lang === 'en'
  return {
    subject: isEn
      ? `Your Pro trial ended`
      : `Tu periodo Pro termino`,
    text: isEn
      ? `${storeName} is now on the free plan. Your store is still online.\n\n         Free    Pro\nProducts   10     200\nPhotos      1       5\nPayments    —     Yes\nCoupons     —     Yes\nDomain      —     Yes\n\nUpgrade anytime for $4.99/month: https://shopifree.app/dashboard/plan\n\n—\nShopifree · Online catalogs via WhatsApp`
      : `${storeName} ahora esta en el plan gratuito. Tu tienda sigue online.\n\n            Gratis   Pro\nProductos     10     200\nFotos          1       5\nTarjeta        —      Si\nCupones        —      Si\nDominio        —      Si\n\nMejora tu plan por $4.99/mes: https://shopifree.app/dashboard/plan\n\n—\nShopifree · Catalogos online por WhatsApp`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:40px 16px">
  <div style="margin-bottom:24px">
    <img src="https://shopifree.app/newlogo.png" alt="Shopifree" height="22" style="height:22px;opacity:0.7">
  </div>
  <div style="background:white;border-radius:4px;padding:32px;border:1px solid #e4e4e7">
    <h1 style="color:#18181b;font-size:20px;font-weight:600;margin:0 0 8px">${isEn ? 'Your Pro trial has ended' : 'Tu periodo Pro termino'}</h1>
    <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0 0 24px">
      ${isEn
        ? `<strong style="color:#18181b">${storeName}</strong> is now on the free plan. Your store is still online.`
        : `<strong style="color:#18181b">${storeName}</strong> ahora esta en el plan gratuito. Tu tienda sigue online.`}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:12px;color:#a1a1aa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px"></td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:12px;color:#a1a1aa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right">${isEn ? 'Free' : 'Gratis'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:12px;color:#18181b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;text-align:right">Pro</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Products' : 'Productos'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#71717a;text-align:right">10</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#18181b;font-weight:500;text-align:right">200</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Photos' : 'Fotos'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#71717a;text-align:right">1</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#18181b;font-weight:500;text-align:right">5</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Card payments' : 'Cobro con tarjeta'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#71717a;text-align:right">—</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#18181b;font-weight:500;text-align:right">${isEn ? 'Yes' : 'Si'}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;font-size:13px;color:#71717a">${isEn ? 'Coupons' : 'Cupones'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#71717a;text-align:right">—</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-bottom:none;border-left:none;font-size:13px;color:#18181b;font-weight:500;text-align:right">${isEn ? 'Yes' : 'Si'}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;font-size:13px;color:#71717a">${isEn ? 'Custom domain' : 'Dominio propio'}</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-left:none;font-size:13px;color:#71717a;text-align:right">—</td>
        <td style="padding:10px 16px;border:1px solid #e4e4e7;border-left:none;font-size:13px;color:#18181b;font-weight:500;text-align:right">${isEn ? 'Yes' : 'Si'}</td>
      </tr>
    </table>
    <p style="color:#71717a;font-size:13px;margin:0 0 20px">
      ${isEn
        ? 'Upgrade anytime for <strong style="color:#18181b">$4.99/month</strong>.'
        : 'Mejora tu plan por <strong style="color:#18181b">$4.99/mes</strong>.'}
    </p>
    <a href="https://shopifree.app/dashboard/plan" style="display:block;background:#18181b;color:white;text-align:center;padding:12px;border-radius:4px;text-decoration:none;font-weight:500;font-size:14px">
      ${isEn ? 'Upgrade to Pro' : 'Pasarme a Pro'}
    </a>
  </div>
  <p style="color:#a1a1aa;font-size:11px;margin-top:20px">
    Shopifree · ${isEn ? 'Online catalogs via WhatsApp' : 'Catalogos online por WhatsApp'}
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
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Shopifree <noreply@shopifree.app>'
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
