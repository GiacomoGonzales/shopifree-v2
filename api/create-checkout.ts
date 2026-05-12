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

  const { action } = req.body

  // ── Portal session ──────────────────────────────────────────────
  if (action === 'portal') {
    try {
      const { userId } = req.body

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' })
      }

      const userDoc = await db.collection('users').doc(userId).get()
      const userData = userDoc.data()

      if (!userData?.stripeCustomerId) {
        return res.status(400).json({ error: 'No subscription found' })
      }

      const origin = req.headers.origin || 'https://shopifree.app'

      const session = await stripe.billingPortal.sessions.create({
        customer: userData.stripeCustomerId,
        return_url: `${origin}/dashboard/plan`
      })

      return res.status(200).json({ url: session.url })
    } catch (error) {
      console.error('Error creating portal session:', error)
      return res.status(500).json({ error: 'Failed to create portal session' })
    }
  }

  // ── Checkout session (default) ──────────────────────────────────
  try {
    const { storeId, plan, billing, userId, email, applyDiscount } = req.body

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

    // We do NOT cancel existing subs here. Sibling cleanup happens in the
    // webhook (retireSiblingSubscriptions) once the new sub is confirmed
    // active — so an abandoned checkout doesn't strand the customer on
    // free plan with paid days lost.
    //
    // Stripe trials are intentionally disabled platform-wide (the 7-day
    // grace period lives in Firestore `trialEndsAt`, not Stripe). When
    // a merchant clicks Subscribe, they pay immediately.
    //
    // NOTE on trial overrides: we do NOT pass `trial_period_days: 0` here.
    // For checkout.sessions.create, Stripe REJECTS 0 (it requires >= 1) —
    // unlike subscriptions.create, where 0 is valid and means "no trial".
    // The defensive backstop lives in the webhook (handleSubscriptionUpdate
    // → trial killer): if any sub arrives with trial_end in the future,
    // we immediately set trial_end='now'. That catches Price-level default
    // trials, Smart Retries, manual Dashboard edits, etc.

    // Get origin for redirect URLs
    const origin = req.headers.origin || 'https://shopifree.app'

    // ── Duplicate-sub guard (Capa 3) ───────────────────────────────
    // If the customer already has a LIVE subscription for this store
    // (active, past_due, trialing), do NOT create a new one. Sibling
    // cancellation in the webhook generates prorated credits that
    // confuse the billing trail (the SKEENS pattern: every month a
    // new sub, old one cancelled, credit accumulating). Redirect them
    // to the Billing Portal so they manage the EXISTING sub.
    //
    // We deliberately EXCLUDE `incomplete` here. An incomplete sub
    // is the result of a failed/abandoned first payment, and Stripe
    // keeps it around for up to 23h before auto-expiring. Blocking
    // on `incomplete` means a merchant whose card declines once
    // can't retry for ~a day, which broke real merchants the day
    // Layer 3 shipped. Better UX: let them start a fresh checkout —
    // the orphan incomplete sub will expire on its own.
    const liveStatuses: Stripe.Subscription.Status[] = ['active', 'past_due', 'trialing']
    const existingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 20
    })
    const liveSubForStore = existingSubs.data.find(s =>
      s.metadata.storeId === storeId && liveStatuses.includes(s.status)
    )
    if (liveSubForStore) {
      console.log(`[create-checkout] Customer ${customerId} already has live sub ${liveSubForStore.id} (status=${liveSubForStore.status}) for store ${storeId} — redirecting to Billing Portal instead of creating duplicate`)
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/dashboard/plan`
      })
      return res.status(200).json({ url: portal.url, redirectedToPortal: true })
    }

    // Handle 50% first month discount (only for monthly billing)
    const useDiscount = applyDiscount && billing === 'monthly'
    let couponId: string | undefined

    if (useDiscount) {
      try {
        // Try to retrieve existing coupon
        const existing = await stripe.coupons.retrieve('FIRST_MONTH_50')
        couponId = existing.id
      } catch {
        // Coupon doesn't exist, create it
        const coupon = await stripe.coupons.create({
          id: 'FIRST_MONTH_50',
          percent_off: 50,
          duration: 'once',
          name: '50% Off First Month'
        })
        couponId = coupon.id
      }
    }

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
      ...(couponId
        ? {
            discounts: [{ coupon: couponId }],
            subscription_data: {
              metadata: { storeId, userId, plan }
            }
          }
        : {
            subscription_data: {
              metadata: { storeId, userId, plan }
            }
          }
      )
    })

    return res.status(200).json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
