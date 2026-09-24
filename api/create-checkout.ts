import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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

const DEFAULT_ORIGIN = 'https://shopifree.app'

// Solo redirigimos (success/cancel/return) a origenes nuestros. El header
// Origin lo controla el cliente: sin whitelist, cualquiera podia armar un
// checkout/portal de Stripe que vuelve a un dominio arbitrario.
function resolveOrigin(req: VercelRequest): string {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : ''
  if (!origin) return DEFAULT_ORIGIN
  if (origin === 'https://shopifree.app' || origin === 'https://www.shopifree.app') return origin
  // Dev local (vite) — solo http con puerto, NO el https://localhost de Capacitor Android
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin
  // Previews de Vercel de este proyecto
  if (/^https:\/\/shopifree-v2(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return origin
  return DEFAULT_ORIGIN
}

// La app redirige /dashboard/* a /es/dashboard y pierde path + query, asi que
// las URLs de vuelta tienen que llevar el prefijo de idioma.
function resolveLang(value: unknown): 'es' | 'en' {
  return value === 'en' ? 'en' : 'es'
}

function planUrl(origin: string, lang: 'es' | 'en', query = ''): string {
  return `${origin}/${lang}/dashboard/plan${query}`
}

// Verifica el Firebase ID token del header Authorization (Bearer).
async function getCaller(req: VercelRequest): Promise<{ uid: string; email: string | null } | null> {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
  try {
    const decoded = await getAuth().verifyIdToken(token)
    return { uid: decoded.uid, email: decoded.email || null }
  } catch (err) {
    console.error('[create-checkout] verifyIdToken failed:', err)
    return null
  }
}

// users/{uid}.stripeCustomerId lo puede escribir el propio usuario (reglas de
// Firestore), asi que no alcanza para confiar en el: confirmamos contra Stripe
// que el customer fue creado para este uid (metadata.userId).
async function getVerifiedUserCustomerId(uid: string): Promise<string | null> {
  const userDoc = await db.collection('users').doc(uid).get()
  const customerId = userDoc.data()?.stripeCustomerId
  if (!customerId || typeof customerId !== 'string') return null
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if ((customer as Stripe.DeletedCustomer).deleted) return null
    if ((customer as Stripe.Customer).metadata?.userId !== uid) {
      console.warn(`[create-checkout] users/${uid}.stripeCustomerId=${customerId} belongs to another user — ignoring`)
      return null
    }
    return customerId
  } catch (err) {
    console.error(`[create-checkout] customers.retrieve(${customerId}) failed:`, err)
    return null
  }
}

// Customer de Stripe para el caller. Prioridad: el de la suscripcion de la
// tienda (store.subscription lo escribe solo el servidor) y despues el del
// usuario verificado contra Stripe.
async function resolveCustomerId(
  uid: string,
  store: FirebaseFirestore.DocumentData | undefined
): Promise<string | null> {
  const storeCustomer = store?.subscription?.stripeCustomerId
  if (typeof storeCustomer === 'string' && storeCustomer) return storeCustomer
  return getVerifiedUserCustomerId(uid)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.body || {}

  // Auth obligatoria para portal y checkout: el uid sale del token, nunca del body.
  const caller = await getCaller(req)
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const userId = caller.uid

  const origin = resolveOrigin(req)
  const lang = resolveLang(req.body?.lang)

  // ── Portal session ──────────────────────────────────────────────
  if (action === 'portal') {
    try {
      const { storeId } = req.body || {}

      // storeId es opcional (clientes viejos solo mandaban userId). Si viene,
      // la tienda tiene que ser del caller; si no, usamos la tienda del caller.
      let store: FirebaseFirestore.DocumentData | undefined
      if (storeId) {
        const storeDoc = await db.collection('stores').doc(String(storeId)).get()
        store = storeDoc.data()
        if (!store || store.ownerId !== userId) {
          return res.status(403).json({ error: 'Forbidden' })
        }
      } else {
        const owned = await db.collection('stores').where('ownerId', '==', userId).limit(1).get()
        store = owned.empty ? undefined : owned.docs[0].data()
      }

      const customerId = await resolveCustomerId(userId, store)
      if (!customerId) {
        return res.status(400).json({ error: 'No subscription found' })
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: planUrl(origin, lang)
      })

      return res.status(200).json({ url: session.url })
    } catch (error) {
      console.error('Error creating portal session:', error)
      return res.status(500).json({ error: 'Failed to create portal session' })
    }
  }

  // ── Checkout session (default) ──────────────────────────────────
  try {
    const { storeId, plan, billing, applyDiscount } = req.body || {}
    const email: string | null = caller.email || (typeof req.body?.email === 'string' ? req.body.email : null)

    if (!storeId || !plan || !billing || !email) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // La tienda tiene que ser del caller: sin esto se podia apuntar la
    // suscripcion (metadata.storeId) a una tienda ajena.
    const storeDoc = await db.collection('stores').doc(String(storeId)).get()
    const store = storeDoc.data()
    if (!store || store.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Get price ID
    const priceKey = `${plan}_${billing}`
    const priceId = PRICES[priceKey]

    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or billing cycle' })
    }

    // Customer de Stripe ya existente (verificado) para este usuario/tienda
    let customerId = await resolveCustomerId(userId, store)

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
      await db.collection('users').doc(userId).set({
        stripeCustomerId: customerId
      }, { merge: true })
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
        return_url: planUrl(origin, lang)
      })
      return res.status(200).json({ url: portal.url, redirectedToPortal: true })
    }

    // Handle 50% first month discount (only for monthly billing)
    //
    // La elegibilidad se calcula en el servidor (antes se confiaba en
    // body.applyDiscount y cualquiera se llevaba 50% en cada alta). Mismo
    // criterio que Plan.tsx qualifiesForDiscount: tuvo el trial de alta y le
    // quedan <= 5 dias o ya vencio; ademas, nunca tuvo una suscripcion real
    // (ni en la tienda ni en Stripe) ni facturas pagas. Un primer pago fallido
    // (incomplete/incomplete_expired) no consume el descuento.
    const NOT_REAL_SUB = ['incomplete', 'incomplete_expired']
    const trialEndRaw = store.trialEndsAt
    const trialEnd: Date | null = trialEndRaw
      ? (typeof trialEndRaw.toDate === 'function' ? trialEndRaw.toDate() : new Date(trialEndRaw))
      : null
    const inDiscountWindow = !!trialEnd && !isNaN(trialEnd.getTime())
      && Date.now() >= trialEnd.getTime() - 5 * 24 * 60 * 60 * 1000
    const hadStoreSub = !!store.subscription?.stripeSubscriptionId
      && !NOT_REAL_SUB.includes(String(store.subscription?.status || ''))
    const hadStripeSub = existingSubs.data.some(s =>
      s.metadata.storeId === storeId && !NOT_REAL_SUB.includes(s.status)
    )
    let eligibleForDiscount = inDiscountWindow && !hadStoreSub && !hadStripeSub
    if (eligibleForDiscount && applyDiscount && billing === 'monthly') {
      const paid = await stripe.invoices.list({ customer: customerId, status: 'paid', limit: 1 })
      if (paid.data.length > 0) eligibleForDiscount = false
    }
    if (applyDiscount && !eligibleForDiscount) {
      console.warn(`[create-checkout] applyDiscount ignored for store ${storeId}: not eligible`)
    }
    const useDiscount = !!applyDiscount && eligibleForDiscount && billing === 'monthly'
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
      success_url: planUrl(origin, lang, '?success=true'),
      cancel_url: planUrl(origin, lang, '?canceled=true'),
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
