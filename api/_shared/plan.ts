/**
 * Server-side effective-plan check for merchant stores — the enforcement
 * counterpart of src/lib/stripe.ts getEffectivePlan (keep the logic in sync).
 *
 * Card-payment creation endpoints call this before talking to any gateway:
 * client-side gating alone is bypassable (a free store could flip
 * payments.*.enabled by writing Firestore directly), but every card charge
 * has to pass through these API routes, so this is the real gate.
 *
 * Mirrors the client's deliberate policies:
 *  - a store with a Stripe subscription in bad standing (past_due/canceled)
 *    still counts as paid — the webhook/cron are the downgrade authority;
 *  - plan pro/business with neither subscription nor trial = admin-granted.
 */

interface TimestampLike {
  toDate?: () => Date
}

export interface StorePlanData {
  plan?: string
  subscription?: { status?: string } | null
  planExpiresAt?: TimestampLike | Date | string | null
  trialEndsAt?: TimestampLike | Date | string | null
}

function toDate(value: TimestampLike | Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate()
  return null
}

/** true when the store's EFFECTIVE plan is pro/business (paid features allowed). */
export function hasPaidEffectivePlan(store: StorePlanData | undefined | null): boolean {
  if (!store) return false
  if (store.plan !== 'pro' && store.plan !== 'business') return false

  // Stripe subscription present → honor the stored plan (mirror of client:
  // even in dunning states, webhook/cron own the downgrade decision).
  if (store.subscription) return true

  // Admin comp expiration
  const compEnd = toDate(store.planExpiresAt)
  if (store.planExpiresAt !== undefined && store.planExpiresAt !== null && compEnd) {
    return compEnd.getTime() > Date.now()
  }
  if (store.planExpiresAt === null) return true // indefinite comp

  // Signup trial
  const trialEnd = toDate(store.trialEndsAt)
  if (trialEnd) return trialEnd.getTime() > Date.now()

  // pro/business with no subscription and no trial = admin-granted access
  return true
}

/**
 * true cuando el plan EFECTIVO es business (ShopiChat / WhatsApp). Misma
 * semantica que hasPaidEffectivePlan (dunning, comps, trial), pero exige
 * que el plan guardado sea 'business': un Pro no alcanza.
 */
export function hasBusinessEffectivePlan(store: StorePlanData | undefined | null): boolean {
  return !!store && store.plan === 'business' && hasPaidEffectivePlan(store)
}

// ── Helpers de suscripcion (webhook de Stripe, sync y crons) ─────────
// Todo lo de abajo es aditivo: hasPaidEffectivePlan no cambia de semantica.

/**
 * Estados de Stripe en los que la suscripcion sigue "viva": active/trialing
 * obvio, y past_due porque Stripe todavia esta reintentando el cobro (dunning)
 * — el comerciante no pierde el plan mientras tanto.
 */
export const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'] as const

/**
 * Que hacer con `store.plan` segun el estado de la suscripcion:
 *  - grant     → active/trialing: el plan sale del price de Stripe.
 *  - keep      → past_due (Stripe reintentando) / incomplete (primer pago en
 *                vuelo): no tocar el plan que ya tenia la tienda.
 *  - downgrade → unpaid / canceled / incomplete_expired / paused: Stripe dejo
 *                de cobrar, la tienda vuelve a free (salvo comp activo).
 */
export function subscriptionPlanAction(status: string | undefined | null): 'grant' | 'keep' | 'downgrade' {
  if (status === 'active' || status === 'trialing') return 'grant'
  if (status === 'past_due' || status === 'incomplete') return 'keep'
  return 'downgrade'
}

/**
 * Price de Stripe → plan. Devuelve null para prices desconocidos: antes caia
 * en 'pro' por defecto, lo que regalaba un plan pago ante cualquier price que
 * no fuera nuestro (o una env var mal configurada).
 */
export function getPlanFromStripePrice(priceId: string | undefined | null): 'pro' | 'business' | null {
  if (!priceId) return null
  const prices: Record<string, 'pro' | 'business'> = {}
  const add = (envId: string | undefined, plan: 'pro' | 'business') => {
    if (envId) prices[envId] = plan
  }
  add(process.env.STRIPE_PRICE_PRO_MONTHLY, 'pro')
  add(process.env.STRIPE_PRICE_PRO_YEARLY, 'pro')
  add(process.env.STRIPE_PRICE_BUSINESS_MONTHLY, 'business')
  add(process.env.STRIPE_PRICE_BUSINESS_YEARLY, 'business')
  return prices[priceId] || null
}

export interface StoreCompData extends StorePlanData {
  subscription?: { status?: string; stripeSubscriptionId?: string } | null
  manualRestoration?: { restoredUntil?: TimestampLike | Date | string | null } | null
}

/** true si un operador restauro tiempo pago a mano (manualRestoration.restoredUntil futuro). */
export function hasActiveManualRestoration(store: StoreCompData | undefined | null): boolean {
  const until = toDate(store?.manualRestoration?.restoredUntil)
  return !!until && until.getTime() > Date.now()
}

/**
 * Decide si el cron puede bajar a free una tienda cuyo trial (trialEndsAt)
 * ya vencio. NO se baja si:
 *  - tiene una suscripcion viva (active/trialing/past_due) — esta pagando;
 *  - tiene un manualRestoration vigente;
 *  - no tiene suscripcion y tiene un comp de admin (planExpiresAt futuro, o
 *    null = comp indefinido, mismo criterio que hasPaidEffectivePlan).
 * Con suscripcion muerta (unpaid/canceled/...) el downgrade lo hace el
 * webhook; aca solo se respeta el mismo criterio.
 */
export function shouldDowngradeExpiredTrial(store: StoreCompData | undefined | null): boolean {
  if (!store) return false
  if (store.plan !== 'pro' && store.plan !== 'business') return false

  const trialEnd = toDate(store.trialEndsAt)
  if (!trialEnd || trialEnd.getTime() > Date.now()) return false

  const status = store.subscription?.status
  if (status && (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) return false

  if (hasActiveManualRestoration(store)) return false

  if (!store.subscription) {
    if (store.planExpiresAt === null) return false // comp indefinido
    const compEnd = toDate(store.planExpiresAt)
    if (compEnd && compEnd.getTime() > Date.now()) return false
  }

  return true
}

/** Standard 403 payload for payment endpoints when the plan doesn't allow cards. */
export const PLAN_REQUIRED_RESPONSE = {
  error: 'PLAN_REQUIRED',
  message: 'Los pagos con tarjeta requieren un plan Pro o Business activo',
} as const
