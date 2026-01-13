import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const PRICES = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY!]: 'pro',
  [process.env.STRIPE_PRICE_PRO_YEARLY!]: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS_MONTHLY!]: 'business',
  [process.env.STRIPE_PRICE_BUSINESS_YEARLY!]: 'business'
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
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
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
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
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
    console.error('Error processing webhook:', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const plan = PRICES[priceId] || 'pro'

  await db.collection('stores').doc(storeId).update({
    plan,
    planExpiresAt: new Date(subscription.current_period_end * 1000),
    subscription: {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    },
    updatedAt: new Date()
  })

  console.log(`Store ${storeId} subscription updated to ${plan}`)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  await db.collection('stores').doc(storeId).update({
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

  const storesSnapshot = await db.collection('stores')
    .where('subscription.stripeCustomerId', '==', customerId)
    .get()

  if (storesSnapshot.empty) {
    console.error('No store found for customer:', customerId)
    return
  }

  const storeDoc = storesSnapshot.docs[0]

  await storeDoc.ref.update({
    'subscription.status': 'past_due',
    updatedAt: new Date()
  })

  console.log(`Store ${storeDoc.id} payment failed, marked as past_due`)
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
