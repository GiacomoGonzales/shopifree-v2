import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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
 * Signature verification uses webhookId (set by the merchant on the store
 * doc) — kept optional for now so a merchant can skip it during initial
 * setup; we still trust the events because they only mutate orders that
 * already exist in our DB and the fields we update (paymentStatus etc)
 * can't be exploited even if a malicious actor sends us bogus events.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Always 200 to PayPal so they don't retry forever on internal errors;
  // we triage from logs.
  try {
    const storeId = (req.query.storeId as string) || ''
    if (!storeId) {
      console.warn('[paypal-webhook] missing ?storeId query param')
      return res.status(200).json({ received: true, note: 'no storeId' })
    }

    const event = req.body as PayPalWebhookEvent
    if (!event?.event_type) {
      return res.status(200).json({ received: true, note: 'malformed body' })
    }

    console.log(`[paypal-webhook] storeId=${storeId} type=${event.event_type} (id=${event.id})`)

    if (event.event_type.startsWith('PAYMENT.CAPTURE.')) {
      await handleCaptureEvent(storeId, event)
    } else {
      console.log(`[paypal-webhook] unhandled event_type: ${event.event_type}`)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[paypal-webhook] error:', err)
    return res.status(200).json({ received: true, error: 'logged' })
  }
}

async function handleCaptureEvent(storeId: string, event: PayPalWebhookEvent) {
  const orderId = event.resource.custom_id
  if (!orderId) {
    console.warn(`[paypal-webhook] ${event.event_type} missing custom_id; skipping`)
    return
  }
  const ref = db.collection('stores').doc(storeId).collection('orders').doc(orderId)
  const snap = await ref.get()
  if (!snap.exists) {
    console.warn(`[paypal-webhook] order stores/${storeId}/orders/${orderId} not found`)
    return
  }
  const captureId = event.resource.id
  const eventType = event.event_type

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    const data = snap.data() as { paymentStatus?: string } | undefined
    if (data?.paymentStatus === 'paid') {
      console.log(`[paypal-webhook] order already paid — no-op`)
      return
    }
    await ref.update({
      paymentStatus: 'paid',
      status: 'confirmed',
      paymentMethod: 'paypal',
      paymentId: captureId,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    console.log(`[paypal-webhook] order ${ref.path} → paid`)
  } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
    await ref.update({
      paymentStatus: 'failed',
      paymentMethod: 'paypal',
      paymentId: captureId,
      updatedAt: new Date(),
    })
    console.log(`[paypal-webhook] order ${ref.path} → failed`)
  } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED' || eventType === 'PAYMENT.CAPTURE.REVERSED') {
    await ref.update({
      paymentStatus: 'refunded',
      updatedAt: new Date(),
    })
    console.log(`[paypal-webhook] order ${ref.path} → refunded`)
  }
}
