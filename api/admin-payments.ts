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

const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify admin access via Firebase Auth token
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const token = authHeader.split('Bearer ')[1]
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth().verifyIdToken(token)

    if (!ADMIN_EMAILS.includes(decoded.email || '')) {
      return res.status(403).json({ error: 'Forbidden' })
    }
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  try {
    const stripe = getStripe()
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const starting_after = req.query.starting_after as string | undefined

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
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
