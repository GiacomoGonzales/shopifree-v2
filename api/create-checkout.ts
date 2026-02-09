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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICES: Record<string, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY!
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { storeId, plan, billing, userId, email } = req.body

    if (!storeId || !plan || !billing || !userId || !email) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Get price ID
    const priceKey = `${plan}_${billing}`
    const priceId = PRICES[priceKey]

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or billing cycle' })
    }

    // Check if user already has a Stripe customer ID
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    let customerId = userData?.stripeCustomerId

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
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

    // Get origin for redirect URLs
    const origin = req.headers.origin || 'https://shopifree.app'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard/plan?success=true`,
      cancel_url: `${origin}/dashboard/plan?canceled=true`,
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

    return res.status(200).json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
