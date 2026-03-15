import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let db: Firestore

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

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

async function verifyAdmin(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false

  try {
    const token = authHeader.split('Bearer ')[1]
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token)
    return ADMIN_EMAILS.includes(decoded.email || '')
  } catch {
    return false
  }
}

// POST /api/sync-subscription { action: 'sync', storeId } - Sync subscription from Stripe
async function handleSync(req: VercelRequest, res: VercelResponse) {
  const { storeId } = req.body

  if (!storeId) {
    return res.status(400).json({ error: 'storeId is required' })
  }

  // Get store from Firebase
  const storeDoc = await getDb().collection('stores').doc(storeId).get()

  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const store = storeDoc.data()
  const subscriptionId = store?.subscription?.stripeSubscriptionId

  if (!subscriptionId) {
    return res.status(400).json({ error: 'No subscription found for this store' })
  }

  // Fetch subscription from Stripe
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)

  const priceId = subscription.items.data[0]?.price.id

  const isActive = subscription.status === 'active' || subscription.status === 'trialing'
  const plan = isActive ? getPlanFromPrice(priceId) : 'free'

  const item = subscription.items.data[0]
  const periodEnd = item?.current_period_end
    ? new Date(Number(item.current_period_end) * 1000)
    : null
  const periodStart = item?.current_period_start
    ? new Date(Number(item.current_period_start) * 1000)
    : null

  const trialEnd = subscription.trial_end
    ? new Date(Number(subscription.trial_end) * 1000)
    : null

  // Update store in Firebase
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

  return res.status(200).json({
    success: true,
    status: subscription.status,
    plan,
    message: `Subscription synced: ${subscription.status}`
  })
}

// POST /api/sync-subscription { action: 'list-payments', limit?, starting_after? } - List paid invoices (admin only)
async function handleListPayments(req: VercelRequest, res: VercelResponse) {
  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const stripe = getStripe()
  const { limit: rawLimit, starting_after } = req.body
  const limit = Math.min(Number(rawLimit) || 50, 100)

  // Fetch paid invoices from Stripe
  const invoices = await stripe.invoices.list({
    limit,
    status: 'paid',
    ...(starting_after && { starting_after }),
  })

  // Get all stores with subscriptions to map customer IDs to store names
  const storesSnapshot = await getDb().collection('stores')
    .where('subscription.stripeCustomerId', '!=', null)
    .get()

  const customerToStore: Record<string, { name: string; subdomain: string; plan: string; id: string }> = {}
  storesSnapshot.forEach(doc => {
    const data = doc.data()
    if (data.subscription?.stripeCustomerId) {
      customerToStore[data.subscription.stripeCustomerId] = {
        name: data.name,
        subdomain: data.subdomain,
        plan: data.plan,
        id: doc.id
      }
    }
  })

  const payments = invoices.data.map(inv => {
    const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || ''
    const store = customerToStore[customerId]

    return {
      id: inv.id,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      periodStart: inv.period_start,
      periodEnd: inv.period_end,
      customerEmail: inv.customer_email,
      customerId,
      storeName: store?.name || null,
      storeSubdomain: store?.subdomain || null,
      storePlan: store?.plan || null,
      storeId: store?.id || null,
      invoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
      description: inv.lines?.data?.[0]?.description || null,
    }
  })

  return res.status(200).json({
    payments,
    hasMore: invoices.has_more,
    lastId: invoices.data[invoices.data.length - 1]?.id || null,
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action } = req.body || {}

    // Default action is 'sync' for backwards compatibility
    if (!action || action === 'sync') {
      return await handleSync(req, res)
    } else if (action === 'list-payments') {
      return await handleListPayments(req, res)
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "sync" or "list-payments"' })
    }
  } catch (error) {
    console.error('Error in sync-subscription:', error)
    const err = error as Error
    return res.status(500).json({ error: 'Internal server error', details: err.message })
  }
}
