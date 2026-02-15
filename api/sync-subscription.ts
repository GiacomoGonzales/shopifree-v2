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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { storeId } = req.body

  if (!storeId) {
    return res.status(400).json({ error: 'storeId is required' })
  }

  try {
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
    const plan = getPlanFromPrice(priceId)

    // Safely convert timestamps (moved to item level in Stripe API 2025+)
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
  } catch (error) {
    console.error('Error syncing subscription:', error)
    const err = error as Error
    return res.status(500).json({ error: 'Failed to sync subscription', details: err.message })
  }
}
