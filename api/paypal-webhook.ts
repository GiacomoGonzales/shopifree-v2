import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getPaymentSecrets } from './_shared/paymentSecrets.js'
import { getExpectedPayment, markOrderPaid, markOrderFailed, markOrderRefunded, paypalAmountMismatch, type OrderDoc } from './_shared/orderTotal.js'
import { paypalFetch, type MerchantCredentials } from '../src/lib/paypal-server.js'

/**
 * Receives PayPal webhook events. With per-merchant credentials there is
 * no global Partner-level webhook — each merchant configures their own
 * webhook in their PayPal Developer Dashboard pointing to:
 *
 *   https://shopifree.app/api/paypal-webhook?storeId=<their_store_id>
 *
 * The storeId query param is how we know which Firestore doc to mutate
 * when a capture lands. Without it we can't route the event safely.
 *
 * Subscribe to:
 *   - PAYMENT.CAPTURE.COMPLETED
 *   - PAYMENT.CAPTURE.DENIED
 *   - PAYMENT.CAPTURE.REFUNDED
 *   - PAYMENT.CAPTURE.REVERSED
 *
 * Seguridad: el body del webhook NO se usa como fuente de verdad.
 *  1. Si la tienda configuró webhookId, se verifica la firma con
 *     /v1/notifications/verify-webhook-signature (credenciales del comerciante)
 *     y se descarta el evento si no es SUCCESS.
 *  2. Siempre se vuelve a leer la captura/reembolso desde la API de PayPal con
 *     las credenciales del comerciante, y se usa ESE estado, custom_id y
 *     monto (comparado con lo que el servidor calculó al crear la orden).
 *  3. Transiciones acotadas: pending|failed → paid, pending → failed,
 *     paid → refunded. Un evento viejo nunca pasa a 'failed' un pedido pagado.
 */

if (!getApps().length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}
const db = getFirestore()

interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource_type: string
  resource: {
    id?: string
    status?: string
    custom_id?: string
    invoice_id?: string
    amount?: { value: string; currency_code: string }
  }
}

interface PayPalCapture {
  id: string
  status: string
  custom_id?: string
  amount?: { value: string; currency_code: string }
}

interface PayPalRefund {
  id: string
  status: string
  links?: { href: string; rel: string }[]
}

function header(req: VercelRequest, name: string): string {
  const v = req.headers[name]
  return (Array.isArray(v) ? v[0] : v) || ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Always 200 to PayPal so they don't retry forever on internal errors;
  // we triage from logs.
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : ''
    if (!storeId) {
      console.warn('[paypal-webhook] missing ?storeId query param')
      return res.status(200).json({ received: true, note: 'no storeId' })
    }

    const event = req.body as PayPalWebhookEvent
    if (!event?.event_type) {
      return res.status(200).json({ received: true, note: 'malformed body' })
    }

    console.log(`[paypal-webhook] storeId=${storeId} type=${event.event_type} (id=${event.id})`)

    if (!event.event_type.startsWith('PAYMENT.CAPTURE.')) {
      console.log(`[paypal-webhook] unhandled event_type: ${event.event_type}`)
      return res.status(200).json({ received: true })
    }

    const storeSnap = await db.collection('stores').doc(storeId).get()
    if (!storeSnap.exists) return res.status(200).json({ received: true, note: 'store not found' })
    const store = storeSnap.data() as Record<string, unknown> & {
      payments?: { paypal?: { sandbox?: boolean; clientId?: string; webhookId?: string } }
    }
    const pp = store.payments?.paypal
    const ppSecret = (await getPaymentSecrets(db, storeId, store)).paypal?.clientSecret
    if (!pp?.clientId || !ppSecret) {
      console.warn('[paypal-webhook] store without PayPal credentials:', storeId)
      return res.status(200).json({ received: true, note: 'not configured' })
    }
    const creds: MerchantCredentials = {
      clientId: pp.clientId,
      secret: ppSecret,
      env: pp.sandbox ? 'sandbox' : 'live',
    }

    // 1) Firma (si el comerciante configuró el Webhook ID)
    if (pp.webhookId) {
      try {
        const verification = await paypalFetch<{ verification_status?: string }>(creds, '/v1/notifications/verify-webhook-signature', {
          method: 'POST',
          body: {
            auth_algo: header(req, 'paypal-auth-algo'),
            cert_url: header(req, 'paypal-cert-url'),
            transmission_id: header(req, 'paypal-transmission-id'),
            transmission_sig: header(req, 'paypal-transmission-sig'),
            transmission_time: header(req, 'paypal-transmission-time'),
            webhook_id: pp.webhookId,
            webhook_event: event,
          },
        })
        if (verification.verification_status !== 'SUCCESS') {
          console.warn(`[paypal-webhook] invalid signature (${verification.verification_status}) — ignoring event ${event.id}`)
          return res.status(200).json({ received: true, note: 'invalid signature' })
        }
      } catch (err) {
        console.error('[paypal-webhook] signature verification error — ignoring event:', err)
        return res.status(200).json({ received: true, note: 'signature not verified' })
      }
    }

    // 2) Re-leer el recurso desde la API de PayPal
    await handleCaptureEvent(storeId, store, creds, event)

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[paypal-webhook] error:', err)
    return res.status(200).json({ received: true, error: 'logged' })
  }
}

async function handleCaptureEvent(
  storeId: string,
  store: Record<string, unknown>,
  creds: MerchantCredentials,
  event: PayPalWebhookEvent,
) {
  const resourceId = event.resource?.id
  if (!resourceId || !/^[A-Za-z0-9-]{5,64}$/.test(resourceId)) {
    console.warn(`[paypal-webhook] ${event.event_type} without valid resource id; skipping`)
    return
  }
  const eventType = event.event_type

  // REFUNDED trae un reembolso; el resto trae la captura
  let capture: PayPalCapture
  if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
    const refund = await paypalFetch<PayPalRefund>(creds, `/v2/payments/refunds/${encodeURIComponent(resourceId)}`)
    const upHref = refund.links?.find(l => l.rel === 'up')?.href || ''
    const captureId = upHref.split('/captures/')[1]?.split(/[/?]/)[0]
    if (!captureId) {
      console.warn('[paypal-webhook] refund without capture link; skipping', resourceId)
      return
    }
    capture = await paypalFetch<PayPalCapture>(creds, `/v2/payments/captures/${encodeURIComponent(captureId)}`)
  } else {
    capture = await paypalFetch<PayPalCapture>(creds, `/v2/payments/captures/${encodeURIComponent(resourceId)}`)
  }

  const orderId = capture.custom_id
  if (!orderId || orderId.includes('/')) {
    console.warn(`[paypal-webhook] capture ${capture.id} missing custom_id; skipping`)
    return
  }
  const ref = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const snap = await ref.get()
  if (!snap.exists) {
    console.warn(`[paypal-webhook] order stores/${storeId}/orders/${orderId} not found`)
    return
  }
  const order = snap.data() as OrderDoc

  // Se decide por el estado REAL de la captura, no por el event_type del body
  if (capture.status === 'COMPLETED') {
    if (order.paymentStatus === 'paid') {
      console.log(`[paypal-webhook] order already paid — no-op`)
      return
    }
    const expected = await getExpectedPayment(db, storeId, orderId, store, order)
    const mismatch = paypalAmountMismatch(capture.custom_id, capture.amount, orderId, expected)
    if (mismatch) {
      console.error(`[paypal-webhook] capture ${capture.id} does not match order ${orderId}: ${mismatch}`)
      await ref.update({ paymentId: capture.id, paymentReview: `paypal:${mismatch}`, updatedAt: new Date() })
      return
    }
    const r = await markOrderPaid(db, storeId, orderId, { paymentId: capture.id, paymentMethod: 'paypal' })
    console.log(`[paypal-webhook] order ${ref.path} → ${r}`)
  } else if (capture.status === 'DECLINED' || capture.status === 'FAILED') {
    const changed = await markOrderFailed(db, storeId, orderId, { paymentId: capture.id, paymentMethod: 'paypal' })
    console.log(`[paypal-webhook] order ${ref.path} → failed (${changed ? 'updated' : 'no-op'})`)
  } else if (capture.status === 'REFUNDED' || (eventType === 'PAYMENT.CAPTURE.REVERSED' && capture.status !== 'PARTIALLY_REFUNDED' && capture.status !== 'PENDING')) {
    // Solo reembolso TOTAL (PARTIALLY_REFUNDED no cambia el estado) y solo si
    // esta captura es la que pagó el pedido
    if (order.paymentId && order.paymentId !== capture.id) {
      console.log(`[paypal-webhook] refund of another capture (${capture.id}) — no-op`)
      return
    }
    const changed = await markOrderRefunded(db, storeId, orderId)
    console.log(`[paypal-webhook] order ${ref.path} → refunded (${changed ? 'updated' : 'no-op'})`)
  } else {
    console.log(`[paypal-webhook] capture ${capture.id} status ${capture.status} — no change`)
  }
}
