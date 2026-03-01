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

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price.id

  // IMPORTANT: Only give paid plan if subscription is active or trialing
  // past_due, canceled, unpaid, incomplete, incomplete_expired = downgrade to free
  const isActive = subscription.status === 'active' || subscription.status === 'trialing'
  const plan = isActive ? getPlanFromPrice(priceId) : 'free'

  const item = subscription.items.data[0]
  console.log(`Updating store ${storeId} with plan ${plan} (status: ${subscription.status}), priceId: ${priceId}`)
  console.log(`Subscription data: period_end=${item?.current_period_end}, period_start=${item?.current_period_start}`)

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

  await getDb().collection('stores').doc(storeId).set({
    plan,
    planExpiresAt: periodEnd,
    subscription: {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      ...(trialEnd && { trialEnd })
    },
    updatedAt: new Date()
  }, { merge: true })

  console.log(`Store ${storeId} subscription updated to ${plan}`)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  await getDb().collection('stores').doc(storeId).update({
    plan: 'free',
    planExpiresAt: null,
    'subscription.status': 'canceled',
    'subscription.cancelAtPeriodEnd': true,
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

  // IMPORTANT: Downgrade to free immediately when payment fails
  // User should not have access to paid features if they haven't paid
  await storeDoc.ref.update({
    plan: 'free',
    'subscription.status': 'past_due',
    updatedAt: new Date()
  })

  console.log(`Store ${storeDoc.id} payment failed, downgraded to free and marked as past_due`)
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
