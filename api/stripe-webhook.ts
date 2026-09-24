import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import { getPlanFromStripePrice, subscriptionPlanAction, hasActiveManualRestoration, type StoreCompData } from './_shared/plan.js'

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

// Coleccion de dedupe de eventos (solo la escribe el admin SDK). expireAt
// permite configurar una TTL policy en Firestore para que no crezca sin fin.
const PROCESSED_EVENTS_COLLECTION = 'stripeWebhookEvents'
const PROCESSED_EVENT_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Marca el evento como en proceso. false = ya lo procesamos (reentrega de Stripe).
async function claimEvent(event: Stripe.Event): Promise<boolean> {
  try {
    await getDb().collection(PROCESSED_EVENTS_COLLECTION).doc(event.id).create({
      type: event.type,
      receivedAt: new Date(),
      expireAt: new Date(Date.now() + PROCESSED_EVENT_TTL_MS),
    })
    return true
  } catch (err) {
    // 6 = ALREADY_EXISTS
    if ((err as { code?: number }).code === 6) return false
    // Si falla el dedupe por otra razon, procesamos igual: los handlers son
    // idempotentes (re-leen la suscripcion de Stripe).
    console.error(`[webhook] dedupe claim failed for ${event.id}:`, err)
    return true
  }
}

async function releaseEvent(eventId: string) {
  try {
    await getDb().collection(PROCESSED_EVENTS_COLLECTION).doc(eventId).delete()
  } catch (err) {
    console.error(`[webhook] failed to release event ${eventId}:`, err)
  }
}

// Los eventos de Stripe pueden llegar desordenados o repetidos: en vez de
// confiar en el snapshot del evento, re-leemos la suscripcion de Stripe y
// escribimos su estado ACTUAL. Si la lectura falla, usamos el del evento.
async function getFreshSubscription(fallback: Stripe.Subscription): Promise<Stripe.Subscription> {
  try {
    return await getStripe().subscriptions.retrieve(fallback.id)
  } catch (err) {
    console.error(`[webhook] subscriptions.retrieve(${fallback.id}) failed, using event payload:`, err)
    return fallback
  }
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

  if (!(await claimEvent(event))) {
    console.log(`[webhook] Duplicate event ${event.id} (${event.type}) — skipped`)
    return res.status(200).json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout completed for session ${session.id}`)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // deleted tambien pasa por aca: la sub fresca viene con status
        // 'canceled' y cae en el camino de downgrade (con chequeo de
        // reemplazo activo y de manualRestoration).
        const subscription = await getFreshSubscription(event.data.object as Stripe.Subscription)
        await handleSubscriptionUpdate(subscription)
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
    // Liberamos el evento para que el reintento de Stripe lo procese.
    await releaseEvent(event.id)
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message })
  }
}

// Politica de plan por estado de la suscripcion (api/_shared/plan.ts →
// subscriptionPlanAction):
//  - active/trialing → plan segun el price.
//  - past_due → Stripe sigue reintentando (dunning): se mantiene el plan.
//  - incomplete / incomplete_expired → el primer pago nunca se cobro: no se
//    toca el plan (trial/comp intactos), solo se registra el intento
//    (handleUnpaidFirstAttempt).
//  - unpaid / canceled / paused → Stripe dejo de cobrar:
//    la tienda baja a free, salvo manualRestoration vigente o una suscripcion
//    de reemplazo activa. Antes 'unpaid' mantenia el plan pago indefinidamente.
const LIVE_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing', 'past_due'])

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { storeId } = subscription.metadata || {}

  if (!storeId) {
    console.error('Missing storeId in subscription metadata')
    return
  }

  // ── Trial killer (Capa 2) ──────────────────────────────────────────
  // Our pricing model has no Stripe trial — the 7-day grace lives in
  // Firestore `trialEndsAt`. If a subscription arrives with `trial_end`
  // in the future, it came from somewhere we don't control: Price-level
  // defaults configured in the Stripe Dashboard, Smart Retries extending
  // a failed renewal, a manual edit in Stripe Dashboard, etc.
  //
  // We end the trial immediately so the merchant gets billed for the
  // current period instead of riding a free month. This is the
  // backstop — even if every other defense fails, this catches it
  // because Stripe webhooks fire on every subscription state change.
  const nowSec = Math.floor(Date.now() / 1000)
  if (subscription.trial_end && subscription.trial_end > nowSec && subscription.status !== 'canceled') {
    console.warn(`[trial-killer] Sub ${subscription.id} arrived with trial_end=${subscription.trial_end} — ending now`)
    try {
      const updated = await getStripe().subscriptions.update(subscription.id, { trial_end: 'now' })
      // Reload local state from the updated sub so the rest of the handler
      // writes the post-trial values to Firestore.
      subscription = updated
    } catch (err) {
      console.error(`[trial-killer] Failed to end trial on ${subscription.id}:`, err)
      // Don't bail — continue with the original sub so we at least sync state.
    }
  }

  const storeRef = getDb().collection('stores').doc(storeId)
  const storeSnap = await storeRef.get()
  if (!storeSnap.exists) {
    // No resucitar tiendas borradas (el set con merge recreaba un doc "zombie").
    console.warn(`Store ${storeId} not found for sub ${subscription.id} (status=${subscription.status}) — skipped`)
    return
  }
  const store = storeSnap.data() as StoreCompData

  const priceId = subscription.items.data[0]?.price.id
  const status = subscription.status
  const item = subscription.items.data[0]
  const action = subscriptionPlanAction(status)

  // Evento de una sub vieja (no la que la tienda tiene registrada) que no esta
  // activa: si la sub registrada sigue viva, no la pisamos con el estado de la
  // vieja (p.ej. un sibling retirado o un incomplete abandonado).
  const currentSubId = store.subscription?.stripeSubscriptionId
  if (action !== 'grant' && currentSubId && currentSubId !== subscription.id) {
    try {
      const current = await getStripe().subscriptions.retrieve(currentSubId)
      if (LIVE_STATUSES.has(current.status)) {
        console.log(`Sub ${subscription.id} (status=${status}) is not the current sub ${currentSubId} (status=${current.status}) of store ${storeId} — ignored`)
        return
      }
    } catch (err) {
      console.error(`Could not retrieve current sub ${currentSubId} for store ${storeId}:`, err)
    }
  }

  // Primer pago nunca cobrado: 'incomplete' (tarjeta rechazada / 3DS en
  // vuelo) o 'incomplete_expired' (Stripe abandono la sub a las 23h). Esta
  // sub NUNCA tuvo una factura pagada ni paso por 'grant', asi que no puede
  // quitarle nada a la tienda: una tienda en trial o con comp de admin que
  // prueba pagar y le rechazan la tarjeta conserva su trial/comp. Antes
  // incomplete_expired bajaba a free (y planExpiresAt: null) y 'incomplete'
  // se guardaba como store.subscription, lo que ademas cambiaba el plan
  // efectivo (con subscription presente se respeta el plan guardado).
  if (status === 'incomplete' || status === 'incomplete_expired') {
    await handleUnpaidFirstAttempt(subscription, store)
    return
  }

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

  const subscriptionPayload = {
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    ...(trialEnd && { trialEnd })
  }

  if (action === 'grant') {
    // Healthy state — write everything including plan + new period end.
    const plan = getPlanFromStripePrice(priceId)
    const update: Record<string, unknown> = {
      subscription: subscriptionPayload,
      updatedAt: new Date(),
    }
    if (plan) {
      update.plan = plan
      update.planExpiresAt = periodEnd
    } else {
      // Price que no es nuestro / env var mal configurada: no regalamos un
      // plan pago (antes caia en 'pro' por defecto).
      console.error(`[webhook] Unknown price ${priceId} on sub ${subscription.id} (store ${storeId}) — plan NOT granted`)
    }
    // Ya paga: el trial de registro deja de aplicar. Si trialEndsAt quedaba,
    // los crons de trial la bajaban a free aunque estuviera pagando.
    if (status === 'active' && store.trialEndsAt) {
      update.trialEndsAt = FieldValue.delete()
    }
    console.log(`Store ${storeId} → plan=${plan ?? '(unchanged)'}, status=${status}, periodEnd=${periodEnd?.toISOString()}`)
    await storeRef.set(update, { merge: true })
  } else if (action === 'keep') {
    // past_due — Stripe still trying. Keep whatever plan +
    // planExpiresAt we already had so the merchant doesn't lose the
    // service they paid for. We only refresh the subscription state fields.
    console.log(`Store ${storeId} → keeping current plan, status=${status} (Stripe in dunning)`)
    await storeRef.set({
      subscription: subscriptionPayload,
      updatedAt: new Date(),
    }, { merge: true })
  } else {
    await handleSubscriptionTerminal(subscription, store, subscriptionPayload)
  }

  // After confirming a fresh active subscription, retire any sibling subs the
  // same store may have left over from an upgrade flow. The cleanup used to
  // live in create-checkout BEFORE the new sub was confirmed, which left
  // customers without service if they abandoned the flow. Doing it here
  // means the old sub is only canceled once Stripe has accepted payment for
  // the new one. `prorate: true` issues a credit for the unused old time.
  if (status === 'active') {
    await retireSiblingSubscriptions(subscription)
  }
}

// Sub cuyo primer pago no se cobro (incomplete / incomplete_expired): solo se
// registra el intento. Si por datos viejos quedo como store.subscription, se
// saca (nunca pago), sin tocar plan / planExpiresAt / trialEndsAt.
async function handleUnpaidFirstAttempt(subscription: Stripe.Subscription, store: StoreCompData) {
  const { storeId } = subscription.metadata || {}
  if (!storeId) return
  const storeRef = getDb().collection('stores').doc(storeId)

  const update: Record<string, unknown> = {
    lastSubscriptionAttempt: {
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      updatedAt: new Date(),
    },
    updatedAt: new Date(),
  }
  const isCurrent = store.subscription?.stripeSubscriptionId === subscription.id
  if (isCurrent) {
    update.subscription = FieldValue.delete()
  }

  // update() (no set/merge): si la tienda se borro, falla en vez de recrearla.
  await storeRef.update(update)
  console.log(`Store ${storeId} → plan unchanged, sub ${subscription.id} status=${subscription.status} (first payment never collected${isCurrent ? ', removed as current subscription' : ''})`)
}

async function retireSiblingSubscriptions(activeSub: Stripe.Subscription) {
  const { storeId } = activeSub.metadata || {}
  if (!storeId) return

  const customerId = activeSub.customer as string
  let listed: Stripe.ApiList<Stripe.Subscription>
  try {
    listed = await getStripe().subscriptions.list({ customer: customerId, limit: 20 })
  } catch (err) {
    console.error(`retireSiblingSubscriptions: list failed for ${customerId}`, err)
    return
  }

  for (const sibling of listed.data) {
    if (sibling.id === activeSub.id) continue
    if (sibling.metadata.storeId !== storeId) continue
    if (sibling.status === 'canceled' || sibling.status === 'incomplete_expired') continue

    console.log(`Retiring sibling sub ${sibling.id} (status=${sibling.status}) for store ${storeId}; replaced by ${activeSub.id}`)
    try {
      await getStripe().subscriptions.cancel(sibling.id, { prorate: true })
    } catch (err) {
      console.error(`Failed to cancel sibling ${sibling.id}:`, err)
    }
  }
}

// unpaid / canceled / paused (incluye el evento
// customer.subscription.deleted): la sub ya no cobra → free, salvo reemplazo
// activo o manualRestoration vigente.
async function handleSubscriptionTerminal(
  subscription: Stripe.Subscription,
  store: StoreCompData,
  subscriptionPayload: Record<string, unknown>
) {
  const { storeId } = subscription.metadata || {}
  if (!storeId) return

  // If a replacement subscription is already active for the same store, this
  // cancel is part of an upgrade flow (we just cancelled the old sub from
  // retireSiblingSubscriptions). Don't downgrade plan to free — the
  // replacement's handleSubscriptionUpdate already wrote plan=pro/business.
  // Webhook ordering between created/active and deleted is not guaranteed,
  // so we re-check here defensively.
  const customerId = subscription.customer as string
  let replacement: Stripe.Subscription | undefined
  try {
    const others = await getStripe().subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10,
    })
    replacement = others.data.find(s => s.id !== subscription.id && s.metadata.storeId === storeId)
  } catch (err) {
    console.error('handleSubscriptionTerminal: list failed', err)
  }

  if (replacement) {
    console.log(`Sub ${subscription.id} ${subscription.status} but replacement ${replacement.id} active for store ${storeId} — keeping plan`)
    return
  }

  const storeRef = getDb().collection('stores').doc(storeId)

  // Operator-restored stores (manualRestoration.restoredUntil in the future,
  // e.g. Pez Cultivo): Stripe re-emitting a cancellation event must not wipe
  // the recovered paid period.
  if (hasActiveManualRestoration(store)) {
    console.log(`Store ${storeId} → keeping plan, status=${subscription.status} (active manualRestoration)`)
    await storeRef.update({
      subscription: subscriptionPayload,
      updatedAt: new Date(),
    })
    return
  }

  // update() (no set/merge): si la tienda se borro entre medio, falla en vez
  // de recrear un doc zombie.
  await storeRef.update({
    plan: 'free',
    planExpiresAt: null,
    subscription: subscriptionPayload,
    updatedAt: new Date(),
  })

  console.log(`Store ${storeId} → plan=free, status=${subscription.status} (sub terminal)`)
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  // Preferimos re-leer la sub de la factura: asi el estado (past_due, unpaid...)
  // es el real y la politica de plan es la misma que en subscription.updated.
  const invoiceSubId = invoice.parent?.subscription_details?.subscription
  if (invoiceSubId) {
    const subscription = await getStripe().subscriptions.retrieve(invoiceSubId as string)
    await handleSubscriptionUpdate(subscription)
    return
  }

  const customerId = invoice.customer as string

  const storesSnapshot = await getDb().collection('stores')
    .where('subscription.stripeCustomerId', '==', customerId)
    .get()

  if (storesSnapshot.empty) {
    console.error('No store found for customer:', customerId)
    return
  }

  const storeDoc = storesSnapshot.docs[0]

  // Mark as past_due but DON'T downgrade to free yet.
  // Stripe retries failed payments (up to 3-4 times over several days).
  // The subscription.deleted / unpaid update will fire if all retries fail,
  // and handleSubscriptionTerminal will downgrade to free at that point.
  await storeDoc.ref.update({
    'subscription.status': 'past_due',
    updatedAt: new Date()
  })

  console.log(`Store ${storeDoc.id} payment failed, marked as past_due (plan kept until subscription is canceled by Stripe)`)
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
