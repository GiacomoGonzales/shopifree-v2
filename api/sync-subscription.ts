import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import { getPlanFromStripePrice, subscriptionPlanAction, hasActiveManualRestoration, type StoreCompData } from './_shared/plan.js'
import { isAdminToken } from './_shared/admin.js'

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


async function verifyAdmin(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[verifyAdmin] No auth header')
    return false
  }

  try {
    const token = authHeader.split('Bearer ')[1]
    // Ensure Firebase Admin is initialized before calling getAuth
    getDb()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token)
    console.log('[verifyAdmin] decoded email:', decoded.email)
    return isAdminToken(decoded)
  } catch (err) {
    console.error('[verifyAdmin] Error:', err)
    return false
  }
}

// Resolve the authenticated caller's uid + email from the Bearer token.
async function getCaller(req: VercelRequest): Promise<{ uid: string; email: string | null; isAdmin: boolean } | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const token = authHeader.split('Bearer ')[1]
    getDb()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token)
    return { uid: decoded.uid, email: decoded.email || null, isAdmin: isAdminToken(decoded) }
  } catch (err) {
    console.error('[getCaller] Error:', err)
    return null
  }
}

// POST /api/sync-subscription { action: 'cancel', storeId } - Cancel a store's
// Stripe subscription. Used by the account-deletion flow so a deleted store
// can't be resurrected by later past_due webhooks. Authorized for the store
// owner (store doc id === owner uid) or an admin.
async function handleCancel(req: VercelRequest, res: VercelResponse) {
  const { storeId } = req.body
  if (!storeId) {
    return res.status(400).json({ error: 'storeId is required' })
  }

  const caller = await getCaller(req)
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const storeDoc = await getDb().collection('stores').doc(storeId).get()
  const isOwner = caller.uid === storeId || (storeDoc.exists && storeDoc.data()?.ownerId === caller.uid)
  const isAdmin = caller.isAdmin
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const subscriptionId = storeDoc.data()?.subscription?.stripeSubscriptionId
  if (!subscriptionId) {
    // Nothing to cancel — treat as success so callers can proceed.
    return res.status(200).json({ success: true, canceled: false, message: 'No subscription to cancel' })
  }

  try {
    await getStripe().subscriptions.cancel(subscriptionId)
  } catch (err) {
    const e = err as Stripe.errors.StripeError
    // Already-canceled / not-found subs are fine for our purposes.
    if (e?.code === 'resource_missing') {
      return res.status(200).json({ success: true, canceled: false, message: 'Subscription already gone' })
    }
    throw err
  }

  return res.status(200).json({ success: true, canceled: true, subscriptionId })
}

// CRON_SECRET (Bearer) — para llamadas server-to-server / crons. Fail closed
// si la env var no esta configurada.
function isCronCall(req: VercelRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  return !!cronSecret && req.headers.authorization === `Bearer ${cronSecret}`
}

// POST /api/sync-subscription { action: 'sync', storeId } - Sync subscription from Stripe.
// Autorizado para el dueno de la tienda, un admin o CRON_SECRET.
async function handleSync(req: VercelRequest, res: VercelResponse) {
  const { storeId } = req.body

  if (!storeId) {
    return res.status(400).json({ error: 'storeId is required' })
  }

  let authorized = isCronCall(req)
  let caller: { uid: string; email: string | null; isAdmin: boolean } | null = null
  if (!authorized) {
    caller = await getCaller(req)
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  // Get store from Firebase
  const storeRef = getDb().collection('stores').doc(storeId)
  const storeDoc = await storeRef.get()

  if (caller) {
    const isOwner = storeDoc.exists && storeDoc.data()?.ownerId === caller.uid
    const isAdmin = caller.isAdmin
    authorized = isOwner || isAdmin
  }
  if (!authorized) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (!storeDoc.exists) {
    return res.status(404).json({ error: 'Store not found' })
  }

  const store = storeDoc.data() as StoreCompData & FirebaseFirestore.DocumentData
  const subscriptionId = store?.subscription?.stripeSubscriptionId

  if (!subscriptionId) {
    return res.status(400).json({ error: 'No subscription found for this store' })
  }

  // Fetch subscription from Stripe
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)

  const item = subscription.items.data[0]
  const priceId = item?.price.id
  const periodEnd = item?.current_period_end
    ? new Date(Number(item.current_period_end) * 1000)
    : null
  const periodStart = item?.current_period_start
    ? new Date(Number(item.current_period_start) * 1000)
    : null

  const trialEnd = subscription.trial_end
    ? new Date(Number(subscription.trial_end) * 1000)
    : null

  const update: Record<string, unknown> = {
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
  }

  // Misma politica que el webhook (api/_shared/plan.ts):
  //  - active/trialing → plan segun el price (price desconocido: no se toca el plan);
  //  - past_due → se mantiene el plan (Stripe sigue reintentando);
  //  - incomplete/incomplete_expired → primer pago nunca cobrado: se saca de
  //    store.subscription y NO se toca el plan (trial/comp intactos);
  //  - unpaid/canceled/paused → free, salvo manualRestoration vigente.
  const action = subscriptionPlanAction(subscription.status)
  if (subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
    update.subscription = FieldValue.delete()
    update.lastSubscriptionAttempt = {
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      updatedAt: new Date(),
    }
  } else if (action === 'grant') {
    const paidPlan = getPlanFromStripePrice(priceId)
    if (paidPlan) {
      update.plan = paidPlan
      update.planExpiresAt = periodEnd
    } else {
      console.error(`[sync-subscription] Unknown price ${priceId} on sub ${subscription.id} (store ${storeId}) — plan not changed`)
    }
  } else if (action === 'downgrade' && !hasActiveManualRestoration(store)) {
    update.plan = 'free'
    update.planExpiresAt = null
  }

  // Update store in Firebase
  await storeRef.set(update, { merge: true })

  const plan = (update.plan as string | undefined) ?? store.plan ?? 'free'

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

// POST /api/sync-subscription { action: 'payments-total' } - Aggregate sum of
// ALL paid invoices (not just the loaded page). Uses Stripe auto-pagination to
// walk every paid invoice, so the response is the true running total — the same
// number you'd see in Stripe Dashboard's Revenue view, in cents → dollars.
//
// Admin-only. Cost: one Stripe page call per ~100 invoices. Acceptable for an
// admin tool that's hit infrequently. If the volume grows past ~1000 invoices
// we should denormalize this into a Firestore counter updated by webhook.
async function handlePaymentsTotal(req: VercelRequest, res: VercelResponse) {
  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const stripe = getStripe()

  let totalAmount = 0
  let totalCount = 0

  // autoPagingEach handles pagination transparently — keeps fetching pages of
  // 100 until Stripe says has_more=false. amount_paid is in cents.
  for await (const inv of stripe.invoices.list({ status: 'paid', limit: 100 })) {
    totalAmount += inv.amount_paid / 100
    totalCount += 1
  }

  return res.status(200).json({
    totalAmount,
    totalCount,
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
    } else if (action === 'cancel') {
      return await handleCancel(req, res)
    } else if (action === 'list-payments') {
      return await handleListPayments(req, res)
    } else if (action === 'payments-total') {
      return await handlePaymentsTotal(req, res)
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "sync", "cancel", "list-payments", or "payments-total"' })
    }
  } catch (error) {
    console.error('Error in sync-subscription:', error)
    const err = error as Error
    return res.status(500).json({ error: 'Internal server error', details: err.message })
  }
}
