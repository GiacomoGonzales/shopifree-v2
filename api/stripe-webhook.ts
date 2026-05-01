import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let db: Firestore

// Initialize Firebase Admin lazily
function getDb(): Firestore {
  if (!db) {
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      })
    }
    db = getFirestore()
  }
  return db
}

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function getPlanFromPrice(priceId: string): string {
  const prices: Record<string, string> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY || '']: 'pro',
    [process.env.STRIPE_PRICE_PRO_YEARLY || '']: 'pro',
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '']: 'business',
    [process.env.STRIPE_PRICE_BUSINESS_YEARLY || '']: 'business'
  }
  return prices[priceId] || 'pro'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    // Get raw body
    const rawBody = await getRawBody(req)
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).json({ error: 'Webhook signature verification failed' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout completed for session ${session.id}`)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const invoiceSubId = invoice.parent?.subscription_details?.subscription
        if (invoiceSubId) {
          const subscription = await getStripe().subscriptions.retrieve(invoiceSubId as string)
          await handleSubscriptionUpdate(subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    const error = err as Error
    console.error('Error processing webhook:', error.message, error.stack)
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message })
  }
}

// Subscription statuses that should keep the merchant on a paid plan: active
// renewals (active) and Stripe-side trials (trialing) are obvious; past_due,
// unpaid, and incomplete are dunning/in-flight states where Stripe hasn't
// given up yet and the merchant must not be locked out preemptively. The
// previous version flipped plan='free' for any non-{active,trialing} status,
// which prematurely downgraded customers whose card simply failed on renewal —
// they would lose access on day 1 of past_due even though they had paid time
// remaining and Stripe was still retrying.
const KEEP_PAID_STATUSES = new Set<Stripe.Subscription.Status>([
  'active', 'trialing', 'past_due', 'unpaid', 'incomplete',
])

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const status = subscription.status
  const item = subscription.items.data[0]

  // Safely convert timestamps (moved to item level in Stripe API 2025+)
  const periodEnd = item?.current_period_end
    ? new Date(Number(item.current_period_end) * 1000)
    : null
  const periodStart = item?.current_period_start
    ? new Date(Number(item.current_period_start) * 1000)
    : null
  const trialEnd = subscription.trial_end
    ? new Date(Number(subscription.trial_end) * 1000)
    : null

  const subscriptionPayload = {
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    ...(trialEnd && { trialEnd })
  }

  if (status === 'active' || status === 'trialing') {
    // Healthy state — write everything including plan + new period end.
    const plan = getPlanFromPrice(priceId)
    console.log(`Store ${storeId} → plan=${plan}, status=${status}, periodEnd=${periodEnd?.toISOString()}`)
    await getDb().collection('stores').doc(storeId).set({
      plan,
      planExpiresAt: periodEnd,
      subscription: subscriptionPayload,
      updatedAt: new Date(),
    }, { merge: true })
  } else if (KEEP_PAID_STATUSES.has(status)) {
    // past_due / unpaid / incomplete — Stripe still trying. Keep whatever
    // plan + planExpiresAt we already had so the merchant doesn't lose the
    // service they paid for. We only refresh the subscription state fields.
    console.log(`Store ${storeId} → keeping current plan, status=${status} (Stripe in dunning)`)
    await getDb().collection('stores').doc(storeId).set({
      subscription: subscriptionPayload,
      updatedAt: new Date(),
    }, { merge: true })
  } else {
    // canceled / incomplete_expired — sub is dead. Drop to free.
    // (customer.subscription.deleted is the canonical signal for this; this
    // branch handles edge cases like incomplete_expired arriving as updated.)
    console.log(`Store ${storeId} → plan=free, status=${status} (sub terminal)`)
    await getDb().collection('stores').doc(storeId).set({
      plan: 'free',
      planExpiresAt: null,
      subscription: subscriptionPayload,
      updatedAt: new Date(),
    }, { merge: true })
  }

  // After confirming a fresh active subscription, retire any sibling subs the
  // same store may have left over from an upgrade flow. The cleanup used to
  // live in create-checkout BEFORE the new sub was confirmed, which left
  // customers without service if they abandoned the flow. Doing it here
  // means the old sub is only canceled once Stripe has accepted payment for
  // the new one. `prorate: true` issues a credit for the unused old time.
  if (status === 'active') {
    await retireSiblingSubscriptions(subscription)
  }
}

async function retireSiblingSubscriptions(activeSub: Stripe.Subscription) {
  const { storeId } = activeSub.metadata || {}
  if (!storeId) return

  const customerId = activeSub.customer as string
  let listed: Stripe.ApiList<Stripe.Subscription>
  try {
    listed = await getStripe().subscriptions.list({ customer: customerId, limit: 20 })
  } catch (err) {
    console.error(`retireSiblingSubscriptions: list failed for ${customerId}`, err)
    return
  }

  for (const sibling of listed.data) {
    if (sibling.id === activeSub.id) continue
    if (sibling.metadata.storeId !== storeId) continue
    if (sibling.status === 'canceled' || sibling.status === 'incomplete_expired') continue

    console.log(`Retiring sibling sub ${sibling.id} (status=${sibling.status}) for store ${storeId}; replaced by ${activeSub.id}`)
    try {
      await getStripe().subscriptions.cancel(sibling.id, { prorate: true })
    } catch (err) {
      console.error(`Failed to cancel sibling ${sibling.id}:`, err)
    }
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  // If a replacement subscription is already active for the same store, this
  // cancel is part of an upgrade flow (we just cancelled the old sub from
  // retireSiblingSubscriptions). Don't downgrade plan to free — the
  // replacement's handleSubscriptionUpdate already wrote plan=pro/business.
  // Webhook ordering between created/active and deleted is not guaranteed,
  // so we re-check here defensively.
  const customerId = subscription.customer as string
  let replacement: Stripe.Subscription | undefined
  try {
    const others = await getStripe().subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10,
    })
    replacement = others.data.find(s => s.id !== subscription.id && s.metadata.storeId === storeId)
  } catch (err) {
    console.error('handleSubscriptionCanceled: list failed', err)
  }

  if (replacement) {
    console.log(`Sub ${subscription.id} canceled but replacement ${replacement.id} active for store ${storeId} — keeping plan`)
    return
  }

  await getDb().collection('stores').doc(storeId).update({
    plan: 'free',
    planExpiresAt: null,
    'subscription.status': 'canceled',
    'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end ?? false,
    updatedAt: new Date()
  })

  console.log(`Store ${storeId} subscription canceled, downgraded to free`)
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const storesSnapshot = await getDb().collection('stores')
    .where('subscription.stripeCustomerId', '==', customerId)
    .get()

  if (storesSnapshot.empty) {
    console.error('No store found for customer:', customerId)
    return
  }

  const storeDoc = storesSnapshot.docs[0]

  // Mark as past_due but DON'T downgrade to free yet.
  // Stripe retries failed payments (up to 3-4 times over several days).
  // The subscription.deleted event will fire if all retries fail,
  // and handleSubscriptionCanceled will downgrade to free at that point.
  await storeDoc.ref.update({
    'subscription.status': 'past_due',
    updatedAt: new Date()
  })

  console.log(`Store ${storeDoc.id} payment failed, marked as past_due (plan kept until subscription is canceled by Stripe)`)
}

// Helper to get raw body from request
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false
  }
}
