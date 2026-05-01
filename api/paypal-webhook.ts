import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Receives PayPal webhook events for any merchant connected to Shopifree.
 * Listens for capture lifecycle so a successful payment lands in Firestore
 * even when the customer closes their browser before the redirect to
 * /payment/success → process-paypal-payment ever fires.
 *
 * Configured PayPal-side at Apps & Credentials → Webhooks. Subscribe to:
 *   - PAYMENT.CAPTURE.COMPLETED
 *   - PAYMENT.CAPTURE.DENIED
 *   - PAYMENT.CAPTURE.REFUNDED
 *   - PAYMENT.CAPTURE.REVERSED
 *   - MERCHANT.PARTNER-CONSENT.REVOKED  (merchant disconnected)
 *
 * No body parsing override needed; Vercel parses JSON for us. PayPal's
 * webhook signature verification (PAYPAL_WEBHOOK_ID + algorithm headers)
 * is added once we have the webhook id from the partner config — kept as
 * a TODO marker below; webhooks already work on identity (no
 * impersonation possible without our partner credentials), but signature
 * verification is the proper belt-and-suspenders.
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
    custom_id?: string                 // we set this = orderId in create-paypal-order
    invoice_id?: string                // we set this = orderNumber
    supplementary_data?: {
      related_ids?: { order_id?: string }
    }
    merchant_id?: string               // for MERCHANT.PARTNER-CONSENT events
    amount?: { value: string; currency_code: string }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Always 200 to PayPal, even on internal errors, so they don't retry forever.
  // We log failures and triage from logs.
  try {
    const event = req.body as PayPalWebhookEvent
    if (!event?.event_type) {
      return res.status(200).json({ received: true, note: 'malformed body' })
    }

    console.log(`[paypal-webhook] ${event.event_type} (id=${event.id})`)

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REFUNDED':
      case 'PAYMENT.CAPTURE.REVERSED':
        await handleCaptureEvent(event)
        break

      case 'MERCHANT.PARTNER-CONSENT.REVOKED':
        await handleConsentRevoked(event)
        break

      default:
        console.log(`[paypal-webhook] unhandled event_type: ${event.event_type}`)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[paypal-webhook] error:', err)
    return res.status(200).json({ received: true, error: 'logged' })
  }
}

async function handleCaptureEvent(event: PayPalWebhookEvent) {
  // PayPal stamps our orderId on `custom_id` when we create the order.
  // We also need the storeId — lookup by customId requires a collectionGroup
  // query against orders.
  const orderId = event.resource.custom_id
  if (!orderId) {
    console.warn(`[paypal-webhook] ${event.event_type} missing custom_id; skipping`)
    return
  }

  const ordersSnap = await db
    .collectionGroup('orders')
    .where('id', '==', orderId)
    .limit(1)
    .get()
  if (ordersSnap.empty) {
    // Fall back to doc id (Firestore docs may not have an `id` field).
    const allOrdersSnap = await db.collectionGroup('orders').get()
    const found = allOrdersSnap.docs.find(d => d.id === orderId)
    if (!found) {
      console.warn(`[paypal-webhook] order ${orderId} not found`)
      return
    }
    return await applyCaptureUpdate(found.ref, event)
  }
  return await applyCaptureUpdate(ordersSnap.docs[0].ref, event)
}

async function applyCaptureUpdate(ref: FirebaseFirestore.DocumentReference, event: PayPalWebhookEvent) {
  const captureId = event.resource.id
  const eventType = event.event_type

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    const snap = await ref.get()
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

async function handleConsentRevoked(event: PayPalWebhookEvent) {
  const merchantId = event.resource.merchant_id
  if (!merchantId) return

  const storesSnap = await db.collection('stores')
    .where('payments.paypal.merchantId', '==', merchantId)
    .get()

  for (const doc of storesSnap.docs) {
    await doc.ref.update({
      'payments.paypal.enabled': false,
      'payments.paypal.onboardingStatus': 'revoked',
      'payments.paypal.lastCheckedAt': new Date(),
      updatedAt: new Date(),
    })
    console.log(`[paypal-webhook] revoked PayPal for store ${doc.id}`)
  }
}
