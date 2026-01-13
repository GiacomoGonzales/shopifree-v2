import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'
import cors from 'cors'

// Initialize Firebase Admin
admin.initializeApp()

const db = admin.firestore()

// Lazy initialization for Stripe
let stripeInstance: Stripe | null = null
function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    })
  }
  return stripeInstance
}

// CORS middleware
const corsHandler = cors({ origin: true })

// Lazy getters for config
const getAdminEmail = () => process.env.ADMIN_EMAIL || 'admin@shopifree.app'
const getPrices = () => ({
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || ''
})

// ============================================
// CREATE CHECKOUT SESSION
// ============================================
export const createCheckoutSession = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    try {
      const { storeId, plan, billing, userId, email } = req.body

      if (!storeId || !plan || !billing || !userId || !email) {
        res.status(400).json({ error: 'Missing required parameters' })
        return
      }

      // Get price ID based on plan and billing
      const priceKey = `${plan}_${billing}` as 'pro_monthly' | 'pro_yearly' | 'business_monthly' | 'business_yearly'
      const priceId = getPrices()[priceKey]

      if (!priceId) {
        res.status(400).json({ error: 'Invalid plan or billing cycle' })
        return
      }

      // Check if user already has a Stripe customer ID
      const userDoc = await db.collection('users').doc(userId).get()
      const userData = userDoc.data()
      let customerId = userData?.stripeCustomerId

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await getStripe().customers.create({
          email,
          metadata: {
            userId,
            storeId
          }
        })
        customerId = customer.id

        // Save customer ID to user document
        await db.collection('users').doc(userId).update({
          stripeCustomerId: customerId
        })
      }

      // Create checkout session
      const session = await getStripe().checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/dashboard/plan?success=true`,
        cancel_url: `${req.headers.origin}/dashboard/plan?canceled=true`,
        metadata: {
          storeId,
          userId,
          plan
        },
        subscription_data: {
          metadata: {
            storeId,
            userId,
            plan
          }
        }
      })

      res.json({ sessionId: session.id, url: session.url })
    } catch (error) {
      console.error('Error creating checkout session:', error)
      res.status(500).json({ error: 'Failed to create checkout session' })
    }
  })
})

// ============================================
// CREATE CUSTOMER PORTAL SESSION
// ============================================
export const createPortalSession = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    try {
      const { userId } = req.body

      if (!userId) {
        res.status(400).json({ error: 'Missing userId' })
        return
      }

      // Get user's Stripe customer ID
      const userDoc = await db.collection('users').doc(userId).get()
      const userData = userDoc.data()

      if (!userData?.stripeCustomerId) {
        res.status(400).json({ error: 'No subscription found' })
        return
      }

      // Create portal session
      const session = await getStripe().billingPortal.sessions.create({
        customer: userData.stripeCustomerId,
        return_url: `${req.headers.origin}/dashboard/plan`
      })

      res.json({ url: session.url })
    } catch (error) {
      console.error('Error creating portal session:', error)
      res.status(500).json({ error: 'Failed to create portal session' })
    }
  })
})

// ============================================
// STRIPE WEBHOOK HANDLER
// ============================================
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    res.status(400).send(`Webhook Error: ${(err as Error).message}`)
    return
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutComplete(session)
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
      await handleInvoicePaid(invoice)
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

  res.json({ received: true })
})

// ============================================
// WEBHOOK HANDLERS
// ============================================

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { storeId, plan } = session.metadata || {}

  if (!storeId || !plan) {
    console.error('Missing metadata in checkout session')
    return
  }

  console.log(`Checkout complete for store ${storeId}, plan: ${plan}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { storeId, plan } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  // Determine plan from price
  const priceId = subscription.items.data[0]?.price.id
  let determinedPlan = plan || 'pro'

  if (priceId === getPrices().business_monthly || priceId === getPrices().business_yearly) {
    determinedPlan = 'business'
  } else if (priceId === getPrices().pro_monthly || priceId === getPrices().pro_yearly) {
    determinedPlan = 'pro'
  }

  // Update store subscription
  await db.collection('stores').doc(storeId).update({
    plan: determinedPlan,
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
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log(`Store ${storeId} subscription updated to ${determinedPlan}`)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  // Downgrade to free plan
  await db.collection('stores').doc(storeId).update({
    plan: 'free',
    planExpiresAt: null,
    'subscription.status': 'canceled',
    'subscription.cancelAtPeriodEnd': true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log(`Store ${storeId} subscription canceled, downgraded to free`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  await handleSubscriptionUpdate(subscription)
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Find store by customer ID
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
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log(`Store ${storeDoc.id} payment failed, marked as past_due`)
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

// Get all stores (admin only)
export const adminGetAllStores = functions.https.onCall(async (request) => {
  // Verify admin
  if (!request.auth?.token.email || request.auth.token.email !== getAdminEmail()) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { limit: limitNum = 50, startAfter } = request.data || {}

  let query = db.collection('stores')
    .orderBy('createdAt', 'desc')
    .limit(limitNum)

  if (startAfter) {
    const startDoc = await db.collection('stores').doc(startAfter).get()
    if (startDoc.exists) {
      query = query.startAfter(startDoc)
    }
  }

  const snapshot = await query.get()
  const stores = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  return { stores }
})

// Update store plan manually (admin only)
export const adminUpdateStorePlan = functions.https.onCall(async (request) => {
  // Verify admin
  if (!request.auth?.token.email || request.auth.token.email !== getAdminEmail()) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { storeId, plan, expiresAt } = request.data

  if (!storeId || !plan) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing storeId or plan')
  }

  await db.collection('stores').doc(storeId).update({
    plan,
    planExpiresAt: expiresAt ? new Date(expiresAt) : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  return { success: true }
})

// Get all users (admin only)
export const adminGetAllUsers = functions.https.onCall(async (request) => {
  // Verify admin
  if (!request.auth?.token.email || request.auth.token.email !== getAdminEmail()) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  const { limit: limitNum = 50, startAfter } = request.data || {}

  let query = db.collection('users')
    .orderBy('createdAt', 'desc')
    .limit(limitNum)

  if (startAfter) {
    const startDoc = await db.collection('users').doc(startAfter).get()
    if (startDoc.exists) {
      query = query.startAfter(startDoc)
    }
  }

  const snapshot = await query.get()
  const users = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  return { users }
})

// Dashboard stats (admin only)
export const adminGetDashboardStats = functions.https.onCall(async (request) => {
  // Verify admin
  if (!request.auth?.token.email || request.auth.token.email !== getAdminEmail()) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }

  // Get counts
  const [storesSnapshot, usersSnapshot] = await Promise.all([
    db.collection('stores').count().get(),
    db.collection('users').count().get()
  ])

  // Get plan distribution
  const planCounts = {
    free: 0,
    pro: 0,
    business: 0
  }

  const storesWithPlans = await db.collection('stores').get()
  storesWithPlans.docs.forEach(doc => {
    const plan = doc.data().plan as keyof typeof planCounts
    if (planCounts[plan] !== undefined) {
      planCounts[plan]++
    }
  })

  return {
    totalStores: storesSnapshot.data().count,
    totalUsers: usersSnapshot.data().count,
    planDistribution: planCounts
  }
})
